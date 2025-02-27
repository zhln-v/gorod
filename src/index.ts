import express, { Request, Response } from "express";

const app = express();
const PORT = 3000;

// Middleware для парсинга JSON
app.use(express.json());

// GET запрос на главную страницу
app.get("/", (req: Request, res: Response) => {
    res.send("Server is running!");
});

// POST запрос на /pay
app.post("/pay", (req: Request, res: Response) => {
    const { amount, orderId, user } = req.body;
    console.log("Получен платёж:", { amount, orderId, user });

    // Ответ для клиента
    res.status(200).json({ message: "Платёж успешно принят" });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
