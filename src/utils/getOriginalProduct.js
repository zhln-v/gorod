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
exports.getOriginalProduct = void 0;
const config_1 = require("../config");
const axios_1 = __importDefault(require("axios"));
const REC_ID = config_1.config.TILDA_REC_ID;
const STOREPART_UID = config_1.config.TILDA_STOREPART_UID;
/**
 * Получает оригинальные данные товара через Tilda API.
 *
 * Функция отправляет GET-запрос к Tilda API для получения данных о товаре по его идентификатору.
 * Параметры storepartuid, recid и параметр c (timestamp) используются для формирования корректного URL запроса.
 *
 * @param {string} productId - Идентификатор товара, который нужно проверить.
 * @returns {Promise<any>} - Обещание, которое возвращает объект с данными товара.
 * @throws {Error} - Выбрасывает ошибку, если запрос завершился неудачно.
 *
 */
const getOriginalProduct = (productId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const c = Date.now();
    const url = `${config_1.config.TILDA_API_URL}getproduct/?storepartuid=${STOREPART_UID}&recid=${REC_ID}&c=${c}&productuid=${productId}`;
    try {
        const response = yield axios_1.default.get(url);
        // Предполагается, что данные товара находятся в response.data.product
        return response.data.product;
    }
    catch (error) {
        console.error("Ошибка при получении товара:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw error;
    }
});
exports.getOriginalProduct = getOriginalProduct;
