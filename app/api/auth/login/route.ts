import { NextResponse } from "next/server";
import { createSessionToken, safeEqual, SESSION_COOKIE, sessionMaxAge, sha256 } from "@/lib/auth";

export async function POST(request: Request) {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.OWNER_PASSWORD_HASH?.trim().toLowerCase();
  const authSecret = process.env.AUTH_SECRET;
  if (!ownerEmail || !passwordHash || !authSecret) {
    return NextResponse.json({ message: "Autentikasi server belum dikonfigurasi." }, { status: 503 });
  }

  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 400 }); }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const valid = safeEqual(email, ownerEmail) && safeEqual(await sha256(password), passwordHash);
  if (!valid) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ message: "Email atau password salah." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(ownerEmail, authSecret), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: sessionMaxAge,
  });
  return response;
}
