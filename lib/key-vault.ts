function vaultKey() {
  const hex = process.env.API_KEYS_ENCRYPTION_KEY || "";
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error("API_KEYS_ENCRYPTION_KEY must be 64 hex characters");
  return Uint8Array.from(hex.match(/../g)!, (x) => parseInt(x, 16));
}
const hex = (x: Uint8Array) => Array.from(x, b => b.toString(16).padStart(2, "0")).join("");
export async function encryptKey(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", vaultKey(), "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)));
  return `${hex(iv)}:${hex(encrypted)}`;
}
export async function decryptKey(value: string) {
  const [ivHex, dataHex] = value.split(":");
  const bytes = (x: string) => Uint8Array.from(x.match(/../g) || [], b => parseInt(b, 16));
  const key = await crypto.subtle.importKey("raw", vaultKey(), "AES-GCM", false, ["decrypt"]);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(ivHex) }, key, bytes(dataHex)));
}
export const maskKey = (value: string) => `${value.slice(0, 4)}••••••${value.slice(-4)}`;
