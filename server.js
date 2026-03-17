const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

const usersFile = path.join(__dirname, 'reptilia-users.json');

function readUsers() {
  try {
    if (!fs.existsSync(usersFile)) {
      fs.writeFileSync(usersFile, JSON.stringify({ diego123: '123' }, null, 2), 'utf8');
    }
    const raw = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (error) {
    console.error('Erro ao ler users file:', error);
    return { diego123: '123' };
  }
}

function writeUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
}

app.get('/api/users', (req, res) => {
  const users = readUsers();
  res.json(users);
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
  }

  const users = readUsers();

  if (users[username]) {
    return res.status(409).json({ message: 'Usuário já existe.' });
  }

  users[username] = password;
  writeUsers(users);

  res.json({ message: 'Cadastro realizado com sucesso!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
