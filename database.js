// Importa o driver do sqlite3
const sqlite3 = require('sqlite3').verbose();

// Define o nome do arquivo do banco de dados que será criado
const DB_SOURCE = "reptiliadb.sqlite";

// Cria e abre a conexão com o banco de dados
// Se o arquivo "reptiliadb.sqlite" não existir, ele será criado automaticamente
const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
      // Se houver erro ao abrir o banco, exibe no console
      console.error(err.message);
      throw err;
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        // O código para criar as tabelas vai aqui
        // O `run` executa um comando SQL sem retornar dados
        db.run(`CREATE TABLE IF NOT EXISTS animais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            species TEXT NOT NULL,
            category TEXT NOT NULL,
            diet TEXT,
            imageUrl TEXT
        )`, (err) => {
            if (err) {
                // Se houver erro na criação da tabela, exibe aqui
                console.error("Erro ao criar tabela 'animais':", err.message);
            } else {
                console.log("Tabela 'animais' pronta.");
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error("Erro ao criar tabela 'users':", err.message);
            } else {
                console.log("Tabela 'users' pronta.");
            }
        });
    }
});

// Exporta a conexão do banco para que outros arquivos (como o server.js) possam usá-la
module.exports = db;
