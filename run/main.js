import crypto from "crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

// ================= CẤU HÌNH =================
const KEYS = {
  API: process.env.API,
  SECRET: process.env.SECRET,
};

const TARGET = {
  symbol: "BTCV1K",
  quantity: "0.00285",
  type: "MARKET",
};

// Tốc độ poll bình thường và khi gần giờ mở
const INTERVAL_IDLE = 2000;   // 2s khi chờ xa
const INTERVAL_ACTIVE = 500;  // 0.5s khi gần giờ mở (an toàn hơn 200ms)
const RATE_LIMIT_WAIT = 5000; // 5s khi bị rate limit

// Số lần retry liên tiếp trước khi tăng delay
let consecutiveErrors = 0;
// ============================================

const BASE_URL = "https://nami.exchange";
const PATH = "/api/v1.0/spot/order";

if (!KEYS.API || !KEYS.SECRET) {
  console.error("❌ Thiếu API hoặc SECRET trong file .env");
  process.exit(1);
}

function createSignature(expires, body) {
  const message = "POST" + PATH + expires + body;
  return crypto.createHmac("sha256", KEYS.SECRET).update(message).digest("hex");
}

function getInterval() {
  // Dùng interval nhanh hơn sau lần thử đầu (sàn đã "gần mở")
  return consecutiveErrors > 3 ? INTERVAL_IDLE : INTERVAL_ACTIVE;
}

async function executeOrder() {
  const expires = Math.floor(Date.now() / 1000) + 60;
  const body = JSON.stringify({
    symbol: TARGET.symbol,
    side: "BUY",
    type: TARGET.type,
    quantity: TARGET.quantity,
  });

  const signature = createSignature(expires, body);
  const timestamp = new Date().toLocaleTimeString();

  try {
    const response = await fetch(BASE_URL + PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-NAMI-APIKEY": KEYS.API,
        "X-NAMI-EXPIRES": expires.toString(),
        "X-NAMI-SIGNATURE": signature,
      },
      body,
    });

    const result = await response.json();

    // Thành công
    if (response.ok && result.status !== "error") {
      console.log(`✅ [${timestamp}] THÀNH CÔNG! Đã đặt lệnh mua!`, result);
      return process.exit(0);
    }

    // Rate limit — dừng lâu hơn để tránh bị block
    if (response.status === 429) {
      consecutiveErrors++;
      console.warn(`[${timestamp}] ⚠️ Rate Limit (lần ${consecutiveErrors})! Nghỉ ${RATE_LIMIT_WAIT / 1000}s...`);
      return setTimeout(executeOrder, RATE_LIMIT_WAIT);
    }

    // Sàn chưa mở hoặc lỗi khác
    consecutiveErrors++;
    const interval = getInterval();
    const reason = result.message || result.msg || result.error || "-";
    console.log(`[${timestamp}] ⏳ HTTP ${response.status} | code: ${result.code ?? "-"} | msg: ${reason} | full: ${JSON.stringify(result)} — thử lại sau ${interval}ms`);
    return setTimeout(executeOrder, interval);

  } catch (error) {
    consecutiveErrors++;
    console.error(`[${timestamp}] 🌐 Lỗi mạng (lần ${consecutiveErrors}):`, error.message);
    return setTimeout(executeOrder, INTERVAL_IDLE);
  }
}

console.log(`🚀 Bắt đầu săn: ${TARGET.symbol} | Số lượng: ${TARGET.quantity}`);
console.log(`⏱️ Tần suất: ${INTERVAL_ACTIVE}ms/lần bình thường, ${INTERVAL_IDLE}ms khi lỗi liên tiếp`);
executeOrder();
