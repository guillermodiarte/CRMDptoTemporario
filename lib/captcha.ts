import crypto from "crypto";

const CAPTCHA_SECRET = process.env.NEXTAUTH_SECRET || "alojamientos-diarte-captcha-secret-key-2026";
const CAPTCHA_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const MIN_SUBMIT_TIME_MS = 1800; // 1.8 seconds minimum (time-gating against instant bot scripts)

export interface CaptchaChallenge {
  question: string;
  token: string;
  timestamp: number;
}

/**
 * Generates a dynamic math/logic challenge with a signed cryptographic token.
 */
export function generateCaptcha(): CaptchaChallenge {
  const operations = ["+", "-", "x"];
  const op = operations[Math.floor(Math.random() * operations.length)];
  let num1 = 0;
  let num2 = 0;
  let answer = 0;
  let question = "";

  if (op === "+") {
    num1 = Math.floor(Math.random() * 15) + 3;
    num2 = Math.floor(Math.random() * 12) + 2;
    answer = num1 + num2;
    question = `¿Cuánto es ${num1} + ${num2}?`;
  } else if (op === "-") {
    num1 = Math.floor(Math.random() * 15) + 10;
    num2 = Math.floor(Math.random() * 9) + 1;
    answer = num1 - num2;
    question = `¿Cuánto es ${num1} - ${num2}?`;
  } else {
    // Multiplication with small numbers
    num1 = Math.floor(Math.random() * 6) + 2;
    num2 = Math.floor(Math.random() * 5) + 2;
    answer = num1 * num2;
    question = `¿Cuánto es ${num1} × ${num2}?`;
  }

  const timestamp = Date.now();
  const rawPayload = `${answer}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", CAPTCHA_SECRET)
    .update(rawPayload)
    .digest("hex");

  const token = `${timestamp}.${signature}`;

  return {
    question,
    token,
    timestamp,
  };
}

/**
 * Verifies a submitted captcha answer against the token.
 */
export function verifyCaptcha(
  userAnswer: string | number,
  token: string,
  clientTimestamp?: number
): { valid: boolean; reason?: string } {
  if (!userAnswer || !token) {
    return { valid: false, reason: "Captcha incompleto o no proporcionado" };
  }

  const [tsStr, signature] = token.split(".");
  const timestamp = parseInt(tsStr, 10);

  if (isNaN(timestamp) || !signature) {
    return { valid: false, reason: "Token de captcha inválido" };
  }

  const now = Date.now();

  // Expiration check
  if (now - timestamp > CAPTCHA_EXPIRATION_MS) {
    return { valid: false, reason: "El código de seguridad ha expirado. Por favor recarga el captcha." };
  }

  // Time-gating: bots submitting too fast (under 1.8 seconds)
  const submitDuration = clientTimestamp ? now - clientTimestamp : now - timestamp;
  if (submitDuration < MIN_SUBMIT_TIME_MS) {
    return { valid: false, reason: "Envío demasiado rápido. Por favor intenta nuevamente." };
  }

  // Normalize user answer (trim and parseInt)
  const normalizedAnswer = String(userAnswer).trim();
  const rawPayload = `${normalizedAnswer}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac("sha256", CAPTCHA_SECRET)
    .update(rawPayload)
    .digest("hex");

  try {
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
    if (!isMatch) {
      return { valid: false, reason: "Respuesta de seguridad incorrecta. Intenta nuevamente." };
    }
  } catch {
    return { valid: false, reason: "Respuesta de seguridad incorrecta." };
  }

  return { valid: true };
}
