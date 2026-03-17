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

const PORT = process.env.PORT || 3002; // Usar 3002 para evitar colisão com Live Preview do VS Code
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

// ... (depois do código de users)

const catalogFile = path.join(__dirname, 'reptilia-catalog.json');

function readCatalog() {
  try {
    if (!fs.existsSync(catalogFile)) {
      // Cria o arquivo com um exemplo se ele não existir
      fs.writeFileSync(catalogFile, JSON.stringify([], null, 2), 'utf8');
    }
    const raw = fs.readFileSync(catalogFile, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    console.error('Erro ao ler catalog file:', error);
    return [];
  }
}

function writeCatalog(catalog) {
  fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2), 'utf8');
}

// ROTA PARA OBTER TODOS OS ANIMAIS
app.get('/api/animais', (req, res) => {
  const catalog = readCatalog();
  res.json(catalog);
});

// ROTA PARA ADICIONAR UM NOVO ANIMAL
app.post('/api/animais', (req, res) => {
  const { name, species, category, price, desc, imgSrc } = req.body;
  if (!name || !species || !price) {
    return res.status(400).json({ message: 'Nome, espécie e preço são obrigatórios.' });
  }

  const catalog = readCatalog();
  
  const newAnimal = {
    id: Date.now(), // Uma forma simples de gerar um ID único
    name,
    species,
    category,
    price,
    desc,
    imgSrc
  };

  catalog.unshift(newAnimal); // Adiciona no início do array
  writeCatalog(catalog);

  res.status(201).json({ message: 'Animal cadastrado com sucesso!', animal: newAnimal });
});
