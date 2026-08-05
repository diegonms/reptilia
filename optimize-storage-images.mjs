// optimize-storage-images.mjs
// Baixa cada foto já existente no bucket animais-fotos, redimensiona para no
// máximo 1600px e recomprime como JPEG (~qualidade 80), regravando NO MESMO
// caminho. Como o caminho não muda, as URLs continuam iguais e o banco NÃO
// precisa ser atualizado.
//
// Roda UMA vez (pode rodar de novo sem problema — ele pula o que já está pequeno).
//
// Requer:  npm i @supabase/supabase-js jimp
// Uso (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE = "cole-a-service-role-key"
//   node optimize-storage-images.mjs

import { createClient } from '@supabase/supabase-js';
import { Jimp } from 'jimp';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dyzxsfzoysfohmnlyvaa.supabase.co';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const BUCKET = 'animais-fotos';
const PREFIX = `/storage/v1/object/public/${BUCKET}/`;
const MAX_LADO = 1600; // px
const QUALIDADE = 80;   // 0-100
const PULAR_ABAIXO_DE = 400 * 1024; // já está leve o bastante -> não reprocessa

if (!SERVICE_ROLE) {
    console.error('Defina SUPABASE_SERVICE_ROLE no ambiente antes de rodar.');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function pathFromUrl(url) {
    if (typeof url !== 'string') return null;
    const i = url.indexOf(PREFIX);
    return i === -1 ? null : decodeURIComponent(url.slice(i + PREFIX.length));
}

async function main() {
    const { data: rows, error } = await db.from('animais').select('id, image_url, img_src, images');
    if (error) throw error;

    // Junta todos os caminhos do nosso bucket (image_url, img_src e o array images)
    const paths = new Set();
    for (const r of rows) {
        for (const v of [r.image_url, r.img_src, ...(Array.isArray(r.images) ? r.images : [])]) {
            const p = pathFromUrl(v);
            if (p) paths.add(p);
        }
    }

    console.log(`Fotos únicas no bucket a verificar: ${paths.size}`);
    let otimizadas = 0, puladas = 0;

    for (const path of paths) {
        const { data: blob, error: dErr } = await db.storage.from(BUCKET).download(path);
        if (dErr) { console.warn(`  ${path}: falha ao baixar (${dErr.message})`); continue; }

        const entrada = Buffer.from(await blob.arrayBuffer());
        if (entrada.length < PULAR_ABAIXO_DE) {
            puladas++;
            continue;
        }

        const img = await Jimp.read(entrada);
        if (img.bitmap.width > MAX_LADO || img.bitmap.height > MAX_LADO) {
            img.scaleToFit({ w: MAX_LADO, h: MAX_LADO });
        }
        const saida = await img.getBuffer('image/jpeg', { quality: QUALIDADE });

        if (saida.length >= entrada.length) {
            puladas++; // recomprimir não ajudou -> mantém original
            continue;
        }

        const { error: uErr } = await db.storage.from(BUCKET).upload(path, saida, {
            upsert: true, contentType: 'image/jpeg', cacheControl: '3600'
        });
        if (uErr) { console.warn(`  ${path}: falha ao regravar (${uErr.message})`); continue; }

        const kb = n => (n / 1024).toFixed(0) + ' KB';
        console.log(`  ${path}: ${kb(entrada.length)} -> ${kb(saida.length)}`);
        otimizadas++;
    }

    console.log(`\nConcluído. Otimizadas: ${otimizadas} | Puladas (já leves): ${puladas}`);
    process.exit(0);
}

main().catch(e => { console.error('FALHOU:', e); process.exit(1); });
