// 1. Importações essenciais
const express = require('express');
const path = require('path');
const cors = require('cors');

// 2. Importa a conexão com o banco de dados! ESTA É A PONTE!
const db = require('./database.js'); 

const app = express();

// 3. Middlewares (configurações do servidor)
app.use(cors());
app.use(express.json()); // Permite que o servidor entenda JSON
app.use(express.static(path.join(__dirname, 'src'))); // Serve os arquivos estáticos do frontend

// --- ROTAS DA API ---

// ROTA PARA OBTER TODOS OS ANIMAIS (agora usando o banco de dados)
app.get('/api/animais', (req, res) => {
  const sql = "SELECT * FROM animais ORDER BY id DESC"; // Pega os mais recentes primeiro
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    // Se não houver erro, envia os resultados (rows) como JSON
    res.json(rows);
  });
});

// ROTA PARA ADICIONAR UM NOVO ANIMAL (agora usando o banco de dados)
app.post('/api/animais', (req, res) => {
  const { name, species, category, diet, imageUrl, imgSrc, price, desc } = req.body;
  if (!name || !species || !category) {
    return res.status(400).json({ message: 'Nome, espécie e categoria são obrigatórios.' });
  }

  const finalImageUrl = imageUrl || imgSrc || null;

  const sql = `INSERT INTO animais (name, species, category, diet, imageUrl, price, desc, imgSrc) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [name, species, category, diet || null, finalImageUrl, price || null, desc || null, imgSrc || null];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Erro no INSERT animais:', err);
      res.status(500).json({ "error": err.message });
      return;
    }
    // Retorna sucesso e o objeto recém-criado com seu novo ID
    res.status(201).json({
      message: 'Animal cadastrado com sucesso!',
      animal: { id: this.lastID, name, species, category, diet, imageUrl: finalImageUrl, price, desc, imgSrc } 
    });
  });
});

// ROTA PARA REGISTRAR UM NOVO USUÁRIO (agora usando o banco de dados)
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
  }

  // Primeiro, verifica se o usuário já existe
  const checkSql = "SELECT * FROM users WHERE username = ?";
  db.get(checkSql, [username], (err, row) => {
    if (err) {
      return res.status(500).json({ "error": err.message });
    }
    if (row) {
      return res.status(409).json({ message: 'Usuário já existe.' });
    }

    // Usuários criados pelo cadastro público nunca são admin
    const insertSql = 'INSERT INTO users (username, password, is_admin) VALUES (?,?,0)';
    db.run(insertSql, [username, password], (err) => {
      if (err) {
        return res.status(500).json({ "error": err.message });
      }
      res.json({ message: 'Cadastro realizado com sucesso!' });
    });
  });
});

// ROTA DE LOGIN — valida credenciais e devolve dados da sessão (incluindo is_admin)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
  }

  const sql = "SELECT id, username, is_admin FROM users WHERE username = ? AND password = ?";
  db.get(sql, [username, password], (err, row) => {
    if (err) {
      return res.status(500).json({ "error": err.message });
    }
    if (!row) {
      return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
    }
    res.json({
      message: 'Login realizado com sucesso!',
      user: {
        id: row.id,
        username: row.username,
        is_admin: row.is_admin === 1
      }
    });
  });
});


// 4. Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
