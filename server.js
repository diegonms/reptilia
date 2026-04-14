// Carrega .env (DATABASE_URL) para desenvolvimento local
require('dotenv').config();
console.log("DATABASE_URL:", process.env.DATABASE_URL);
const express = require('express');
const path = require('path');
const cors = require('cors');

const db = require('./database.js');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // imagens em base64 podem ser grandes
app.use(express.static(path.join(__dirname, 'src')));

// --- ROTAS DA API ---

// Lista todos os animais (mais recentes primeiro)
// Aliases transformam snake_case do DB em camelCase p/ o frontend
app.get('/api/animais', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, species, category, diet,
                   image_url   AS "imageUrl",
                   price,
                   description AS "desc",
                   img_src     AS "imgSrc"
            FROM animais
            ORDER BY id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro no GET /api/animais:', err);
        res.status(500).json({ error: err.message });
    }
});

// Cadastra um novo animal
app.post('/api/animais', async (req, res) => {
    const { name, species, category, diet, imageUrl, imgSrc, price, desc } = req.body;
    if (!name || !species || !category) {
        return res.status(400).json({ message: 'Nome, espécie e categoria são obrigatórios.' });
    }

    const finalImageUrl = imageUrl || imgSrc || null;

    try {
        const result = await db.query(
            `INSERT INTO animais (name, species, category, diet, image_url, price, description, img_src)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [name, species, category, diet || null, finalImageUrl, price || null, desc || null, imgSrc || null]
        );

        res.status(201).json({
            message: 'Animal cadastrado com sucesso!',
            animal: {
                id: result.rows[0].id,
                name, species, category, diet,
                imageUrl: finalImageUrl, price, desc, imgSrc
            }
        });
    } catch (err) {
        console.error('Erro no INSERT animais:', err);
        res.status(500).json({ error: err.message });
    }
});

// Remove um animal do catálogo (apenas admin)
app.delete('/api/animais/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
        return res.status(400).json({ message: 'ID inválido.' });
    }

    // Verificação leve: o cliente precisa enviar o username do admin no header.
    // Não é segurança forte (ainda não temos JWT/sessão no servidor), mas evita
    // que o endpoint seja chamado sem qualquer contexto de admin.
    const requester = req.header('x-username');
    if (!requester) {
        return res.status(401).json({ message: 'Autenticação necessária.' });
    }

    try {
        const userRes = await db.query(
            'SELECT is_admin FROM users WHERE username = $1',
            [requester]
        );
        if (userRes.rowCount === 0 || userRes.rows[0].is_admin !== true) {
            return res.status(403).json({ message: 'Apenas administradores podem excluir animais.' });
        }

        const del = await db.query('DELETE FROM animais WHERE id = $1', [id]);
        if (del.rowCount === 0) {
            return res.status(404).json({ message: 'Animal não encontrado.' });
        }

        res.json({ message: 'Animal removido com sucesso.', id });
    } catch (err) {
        console.error('Erro no DELETE /api/animais/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// Registro de usuário (nunca cria admin pelo endpoint público)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    try {
        const existing = await db.query("SELECT id FROM users WHERE username = $1", [username]);
        if (existing.rowCount > 0) {
            return res.status(409).json({ message: 'Usuário já existe.' });
        }

        await db.query(
            'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, FALSE)',
            [username, password]
        );

        res.json({ message: 'Cadastro realizado com sucesso!' });
    } catch (err) {
        console.error('Erro no /api/register:', err);
        res.status(500).json({ error: err.message });
    }
});

// Lista de usuários (apenas admin) — usada pelo painel de clientes
app.get('/api/users', async (req, res) => {
    const requester = req.header('x-username');
    if (!requester) {
        return res.status(401).json({ message: 'Autenticação necessária.' });
    }

    try {
        const who = await db.query('SELECT is_admin FROM users WHERE username = $1', [requester]);
        if (who.rowCount === 0 || who.rows[0].is_admin !== true) {
            return res.status(403).json({ message: 'Apenas administradores podem listar usuários.' });
        }

        const rows = await db.query(
            'SELECT id, username, is_admin FROM users ORDER BY id ASC'
        );
        res.json(rows.rows);
    } catch (err) {
        console.error('Erro no GET /api/users:', err);
        res.status(500).json({ error: err.message });
    }
});

// Login — retorna dados da sessão, incluindo is_admin
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    try {
        const result = await db.query(
            "SELECT id, username, is_admin FROM users WHERE username = $1 AND password = $2",
            [username, password]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        const row = result.rows[0];
        res.json({
            message: 'Login realizado com sucesso!',
            user: {
                id: row.id,
                username: row.username,
                is_admin: row.is_admin === true
            }
        });
    } catch (err) {
        console.error('Erro no /api/login:', err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
