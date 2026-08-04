// migrate-base64-to-storage.mjs
// Migra as fotos base64 gravadas nas colunas image_url / img_src / images
// da tabela `animais` para o Supabase Storage (bucket animais-fotos),
// e atualiza as 3 colunas para apontarem para as URLs públicas.
//
// Roda UMA vez.
//
// Requer:  npm i @supabase/supabase-js
// Uso (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE = "cole-a-service-role-key-aqui"
//   node migrate-base64-to-storage.mjs
//
// A service_role key está em: Supabase > Settings > API > service_role.
// NUNCA comite essa chave nem a coloque no index.html (ela ignora RLS).

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dyzxsfzoysfohmnlyvaa.supabase.co';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const BUCKET = 'animais-fotos';

if (!SERVICE_ROLE) {
    console.error('Defina SUPABASE_SERVICE_ROLE no ambiente antes de rodar.');
    console.error('Ex (PowerShell):  $env:SUPABASE_SERVICE_ROLE = "..."; node migrate-base64-to-storage.mjs');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const EXT_POR_MIME = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif'
};

function isDataUrl(v) {
    return typeof v === 'string' && v.startsWith('data:');
}

// "data:image/png;base64,AAAA" -> { buffer, mime, ext }
function decodeDataUrl(dataUrl) {
    const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
    if (!m) throw new Error('data URL inválida');
    const mime = m[1] || 'application/octet-stream';
    const isB64 = !!m[2];
    const raw = m[3];
    const buffer = isB64
        ? Buffer.from(raw, 'base64')
        : Buffer.from(decodeURIComponent(raw), 'utf-8');
    const ext = EXT_POR_MIME[mime] || 'bin';
    return { buffer, mime, ext };
}

async function subirUmaFoto(rowId, dataUrl) {
    const { buffer, mime, ext } = decodeDataUrl(dataUrl);
    const path = `migrado/${rowId}/${randomUUID()}.${ext}`;
    const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
        contentType: mime,
        cacheControl: '3600',
        upsert: false
    });
    if (error) throw error;
    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);
    return pub.publicUrl;
}

async function main() {
    // Busca só os IDs primeiro (consulta leve, não puxa o base64).
    const { data: ids, error: idErr } = await db
        .from('animais')
        .select('id')
        .order('id', { ascending: true });
    if (idErr) throw idErr;

    console.log(`Total de linhas na tabela: ${ids.length}. Verificando uma por uma...`);

    // Busca cada linha individualmente (uma por vez) para não montar um JSON gigante.
    const alvo = [];
    for (const { id } of ids) {
        const { data: row, error } = await db
            .from('animais')
            .select('id, image_url, img_src, images')
            .eq('id', id)
            .single();
        if (error) {
            console.warn(`  #${id}: falha ao ler (${error.message}) — pulando.`);
            continue;
        }
        const temBase64 = isDataUrl(row.image_url) || isDataUrl(row.img_src) ||
            (Array.isArray(row.images) && row.images.some(isDataUrl));
        if (temBase64) alvo.push(row);
    }

    console.log(`Linhas com base64 a migrar: ${alvo.length}`);

    for (const row of alvo) {
        // Fonte de verdade das fotos: array `images`; se vazio, cai pro img_src/image_url
        const fonte = Array.isArray(row.images) && row.images.length
            ? row.images
            : [row.img_src || row.image_url].filter(Boolean);

        const novasUrls = [];
        for (const foto of fonte) {
            if (isDataUrl(foto)) {
                const url = await subirUmaFoto(row.id, foto);
                novasUrls.push(url);
                console.log(`  #${row.id} -> ${url}`);
            } else if (foto) {
                novasUrls.push(foto); // já era URL, mantém
            }
        }

        if (novasUrls.length === 0) {
            console.warn(`  #${row.id}: nenhuma foto válida, pulando.`);
            continue;
        }

        const { error: upErr } = await db.from('animais').update({
            image_url: novasUrls[0],
            img_src: novasUrls[0],
            images: novasUrls
        }).eq('id', row.id);
        if (upErr) throw upErr;
        console.log(`  #${row.id} atualizado (${novasUrls.length} foto(s)).`);
    }

    console.log('\nMigração concluída.');
    console.log('Agora rode o VACUUM (veja VACUUM.sql / instruções) para recuperar o espaço TOAST.');
}

main().catch(e => { console.error('FALHOU:', e); process.exit(1); });
