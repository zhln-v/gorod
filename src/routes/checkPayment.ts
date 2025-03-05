import express, { Request, Response } from "express";
import { checkPaymentByUniqueId } from "../services/checkPaymentByUniqueId";

const router = express.Router();

// Проверка платежа по uniqueId
router.get("/:uniqueId", async (req: Request, res: Response) => {
    try {
        const { uniqueId } = req.params;

        if (!uniqueId) {
            res.status(400).json({ error: "❌ Отсутствует uniqueId" });
            return;
        }

        const paymentStatus = await checkPaymentByUniqueId(uniqueId);

        if (paymentStatus.error) {
            res.status(404).json(paymentStatus);
            return;
        }

        res.json(paymentStatus);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export { router as checkPayment };
