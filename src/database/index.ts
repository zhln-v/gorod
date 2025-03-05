import Database from "better-sqlite3";

const db = new Database("payments.db");

// Создаём таблицу, если её нет, с первичным ключом paymentId
db.exec(`
    CREATE TABLE IF NOT EXISTS pending_payments (
        productId TEXT NOT NULL,
        paymentId TEXT PRIMARY KEY,
        productTitle TEXT NOT NULL,
        productDescription TEXT NOT NULL,
        amount TEXT NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        date TEXT DEFAULT '{}'
    );
`);

export default db;
