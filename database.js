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
    }

    console.log('Conectado ao banco de dados SQLite.');

    // Força execução sequencial de todas as operações de schema / seed
    db.serialize(() => {
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
            if (err) console.error("Erro ao criar tabela 'animais':", err.message);
            else console.log("Tabela 'animais' pronta.");
        });

        // Adiciona colunas extras se já existir tabela antiga sem elas
        const ensureColumn = (table, columnDef) => {
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
            password TEXT NOT NULL,
            is_admin INTEGER NOT NULL DEFAULT 0
        )`, (err) => {
            if (err) console.error("Erro ao criar tabela 'users':", err.message);
            else console.log("Tabela 'users' pronta.");
        });

        // Para bancos antigos sem is_admin. SQLite não aceita NOT NULL em ADD COLUMN
        // quando a tabela já tem linhas, então adicionamos apenas com DEFAULT.
        ensureColumn('users', 'is_admin INTEGER DEFAULT 0');

        // Seed do usuário administrador padrão (login: admin / senha: admin123)
        db.run(
            `INSERT OR IGNORE INTO users (username, password, is_admin) VALUES (?, ?, 1)`,
            ['admin', 'admin123'],
            (seedErr) => {
                if (seedErr) {
                    console.warn('Não foi possível criar admin padrão:', seedErr.message);
                } else {
                    console.log("Usuário admin padrão pronto (admin / admin123).");
                }
            }
        );
    });
});

// Exporta a conexão do banco para que outros arquivos (como o server.js) possam usá-la
module.exports = db;
