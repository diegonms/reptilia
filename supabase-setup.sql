-- ============================================================
-- Setup do banco Reptilia no Supabase
-- Execute este script INTEIRO no SQL Editor do Supabase, uma vez.
-- ============================================================

-- 1) Tabela animais (cria se ainda nao existir)
CREATE TABLE IF NOT EXISTS public.animais (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  species     TEXT NOT NULL,
  category    TEXT NOT NULL,
  diet        TEXT,
  image_url   TEXT,
  price       NUMERIC,
  description TEXT,
  img_src     TEXT,
  images      JSONB DEFAULT '[]'::jsonb
);

-- 1b) Se a tabela ja existia sem a coluna images, adiciona agora
ALTER TABLE public.animais ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 2) Tabela profiles (1-pra-1 com auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT,
  is_admin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Trigger: cria profile automaticamente quando alguem se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    FALSE
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Helper para checar admin sem recursao em policy
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

-- 5) Liga Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animais  ENABLE ROW LEVEL SECURITY;

-- 6) Policies de profiles
DROP POLICY IF EXISTS "profiles_select_self"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

-- usuario logado le o proprio perfil
CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- admin le todos os perfis (lista de clientes)
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- 7) Policies de animais
DROP POLICY IF EXISTS "animais_select_all"   ON public.animais;
DROP POLICY IF EXISTS "animais_insert_admin" ON public.animais;
DROP POLICY IF EXISTS "animais_update_admin" ON public.animais;
DROP POLICY IF EXISTS "animais_delete_admin" ON public.animais;

-- catalogo publico
CREATE POLICY "animais_select_all" ON public.animais
  FOR SELECT USING (TRUE);

-- so admin altera catalogo
CREATE POLICY "animais_insert_admin" ON public.animais
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "animais_update_admin" ON public.animais
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "animais_delete_admin" ON public.animais
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- DEPOIS de criar o usuario admin (via UI ou via Auth do Supabase),
-- rode o UPDATE abaixo trocando o email pelo seu:
-- ============================================================
-- UPDATE public.profiles SET is_admin = TRUE
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@reptilia.com');
