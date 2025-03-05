import { config } from "../config";
import axios from "axios";

const REC_ID = config.TILDA_REC_ID;
const STOREPART_UID = config.TILDA_STOREPART_UID;

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
export const getOriginalProduct = async (productId: string): Promise<any> => {
    const c = Date.now();
    const url = `${config.TILDA_API_URL}getproduct/?storepartuid=${STOREPART_UID}&recid=${REC_ID}&c=${c}&productuid=${productId}`;

    try {
        const response = await axios.get(url);
        // Предполагается, что данные товара находятся в response.data.product
        return response.data.product;
    } catch (error: any) {
        console.error(
            "Ошибка при получении товара:",
            error.response?.data || error.message
        );
        throw error;
    }
};
