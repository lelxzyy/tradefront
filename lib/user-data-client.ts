export async function loadUserData() {
  const response = await fetch("/api/user-data", { cache: "no-store" });
  if (!response.ok) throw new Error("Gagal memuat data pengguna");
  return (await response.json()).data;
}

export async function saveUserSection(section: string, value: unknown) {
  return fetch("/api/user-data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set", section, value }) });
}

export async function appendUserHistory(section: "aiHistory" | "signalHistory", value: unknown) {
  return fetch("/api/user-data", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "append", section, value }) });
}
