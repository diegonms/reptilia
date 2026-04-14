// Conexão Postgres (Render-compatible)
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('ERRO: variável DATABASE_URL não definida.');
    console.error('Crie um arquivo .env com: DATABASE_URL=postgres://user:pass@host:5432/dbname');
    process.exit(1);
}

// Render Postgres exige SSL nas conexões externas.
// Conexões locais (localhost/127.0.0.1) ficam sem SSL.
const useSsl = !/localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false
});

async function init() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS animais (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            species TEXT NOT NULL,
            category TEXT NOT NULL,
            diet TEXT,
            image_url TEXT,
            price NUMERIC,
            description TEXT,
            img_src TEXT
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            is_admin BOOLEAN NOT NULL DEFAULT FALSE
        )
    `);

    // Seed do admin padrão (admin / admin123)
    const seed = await pool.query(
        `INSERT INTO users (username, password, is_admin)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (username) DO NOTHING`,
        ['admin', 'admin123']
    );

    console.log('Conectado ao Postgres.');
    console.log("Tabelas 'animais' e 'users' prontas.");
    if (seed.rowCount > 0) {
        console.log('Usuário admin padrão criado (admin / admin123).');
    } else {
        console.log('Usuário admin padrão já existia.');
    }
}

init().catch(err => {
    console.error('Falha ao inicializar o banco:', err.message);
    process.exit(1);
});

module.exports = pool;
