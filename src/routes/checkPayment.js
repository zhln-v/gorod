"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPayment = void 0;
const express_1 = __importDefault(require("express"));
const checkPaymentByUniqueId_1 = require("../services/checkPaymentByUniqueId");
const router = express_1.default.Router();
exports.checkPayment = router;
// Проверка платежа по uniqueId
router.get("/:uniqueId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uniqueId } = req.params;
        if (!uniqueId) {
            res.status(400).json({ error: "❌ Отсутствует uniqueId" });
            return;
        }
        const paymentStatus = yield (0, checkPaymentByUniqueId_1.checkPaymentByUniqueId)(uniqueId);
        if (paymentStatus.error) {
            res.status(404).json(paymentStatus);
            return;
        }
        res.json(paymentStatus);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
