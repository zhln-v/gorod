"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 📁 Создаем директорию для логов, если её нет
const logDir = "logs";
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir);
}
// ⚡ Форматирование логов
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
}));
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json());
// 🚀 Конфигурация логгера
exports.logger = winston_1.default.createLogger({
    level: "debug", // Устанавливаем уровень логирования (можно "info")
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        // 🔴 Файл ошибок
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, "error.log"),
            level: "error",
            format: fileFormat,
        }),
        // 🔵 Общий лог
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, "combined.log"),
            format: fileFormat,
        }),
        // 🖥️ Вывод в консоль с цветами
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
    ],
});
