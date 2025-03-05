"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const db = new better_sqlite3_1.default("payments.db");
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
exports.default = db;
