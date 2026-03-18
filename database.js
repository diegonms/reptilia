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
            imageUrl TEXT,
            price REAL,
            desc TEXT,
            imgSrc TEXT
        )`, (err) => {
            if (err) {
                console.error("Erro ao criar tabela 'animais':", err.message);
            } else {
                console.log("Tabela 'animais' pronta.");
            }
        });

        // Adiciona colunas extras se já existir table antiga sem elas
        const ensureColumn = (table, columnDef) => {
            const [name] = columnDef.split(' ');
            db.get(`PRAGMA table_info(${table})`, (err, row) => {
                // Não precisa lógica complexa; se colúnulas já existem, ALTER TABLE falha e ignoramos no callback
            });
            db.run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`, (err) => {
                if (err && !/duplicate column/i.test(err.message)) {
                    console.warn(`Não foi possível adicionar coluna ${columnDef} em ${table}:`, err.message);
                }
            });
        };
        ensureColumn('animais', 'price REAL');
        ensureColumn('animais', 'desc TEXT');
        ensureColumn('animais', 'imgSrc TEXT');

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
