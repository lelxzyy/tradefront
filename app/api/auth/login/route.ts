import { NextResponse } from "next/server";
import { createSessionToken, hashPassword, safeEqual, SESSION_COOKIE, sessionMaxAge, sha256, verifyPassword } from "@/lib/auth";
import { database } from "@/lib/mongodb";

export async function POST(request: Request) {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.OWNER_PASSWORD_HASH?.trim().toLowerCase();
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret || !(process.env.MONGODB_URI || process.env.MONGODB_URL)) {
    return NextResponse.json({ message: "Autentikasi server belum dikonfigurasi." }, { status: 503 });
  }

  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 400 }); }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const candidateHash = await sha256(password);
  const db = await database();
  const users = db.collection("users");
  await users.createIndex({ email: 1 }, { unique: true });
  let user = await users.findOne<{ email: string; passwordHash: string }>({ email });

  // Bootstrap the first owner from server-only environment variables.
  if (!user && ownerEmail && passwordHash && safeEqual(email, ownerEmail) && safeEqual(candidateHash, passwordHash)) {
    await users.insertOne({ email, passwordHash: await hashPassword(password), role: "owner", createdAt: new Date(), lastLoginAt: new Date() });
    user = await users.findOne<{ email: string; passwordHash: string }>({ email });
  }

  const valid = Boolean(user && await verifyPassword(password, user.passwordHash));
  if (!valid) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ message: "Email atau password salah." }, { status: 401 });
  }
  if (user && !user.passwordHash.startsWith("pbkdf2$")) {
    await users.updateOne({ email }, { $set: { passwordHash: await hashPassword(password) } });
  }
  await users.updateOne({ email }, { $set: { lastLoginAt: new Date() } });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(email, authSecret), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: sessionMaxAge,
  });
  return response;
}
