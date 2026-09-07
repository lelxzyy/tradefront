export const SESSION_COOKIE = "xau_owner_session";
export const sessionMaxAge = 60 * 60 * 24 * 7;

export type Session = { email: string; exp: number };

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

async function signature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return Array.from(signed, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export async function sha256(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const safeEqual = constantTimeEqual;

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 210_000 }, key, 256));
  const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `pbkdf2$${hex(salt)}$${hex(bits)}`;
}

export async function verifyPassword(password: string, stored: string) {
  if (!stored.startsWith("pbkdf2$")) return safeEqual(await sha256(password), stored);
  const [, saltHex, expected] = stored.split("$");
  if (!saltHex || !expected) return false;
  const salt = Uint8Array.from(saltHex.match(/.{2}/g) || [], (byte) => parseInt(byte, 16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 210_000 }, key, 256));
  const actual = Array.from(bits, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return safeEqual(actual, expected);
}

export async function createSessionToken(email: string, secret: string) {
  const session: Session = { email, exp: Math.floor(Date.now() / 1000) + sessionMaxAge };
  const payload = toBase64Url(JSON.stringify(session));
  return `${payload}.${await signature(payload, secret)}`;
}

export async function readSessionToken(token: string | undefined, secret: string | undefined): Promise<Session | null> {
  if (!token || !secret) return null;
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra) return null;
  try {
    if (!constantTimeEqual(providedSignature, await signature(payload, secret))) return null;
    const session = JSON.parse(fromBase64Url(payload)) as Session;
    return typeof session.email === "string" && session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string | undefined, secret: string | undefined) {
  return Boolean(await readSessionToken(token, secret));
}
