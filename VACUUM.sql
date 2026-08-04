-- Rode ESTE arquivo no SQL Editor do Supabase DEPOIS que o
-- migrate-base64-to-storage.mjs terminar com sucesso.
-- Objetivo: recuperar o espaço TOAST liberado pela remoção do base64.

-- Opção A (não bloqueia): devolve o espaço para reuso da própria tabela.
VACUUM (VERBOSE, ANALYZE) public.animais;

-- Opção B: encolhe o arquivo físico e DEVOLVE o espaço ao sistema operacional.
-- Reescreve a tabela e usa lock exclusivo, mas com poucas linhas é instantâneo.
-- É esta que realmente derruba os ~40MB no disco. Não pode rodar dentro de BEGIN/transação.
VACUUM (FULL, VERBOSE, ANALYZE) public.animais;
