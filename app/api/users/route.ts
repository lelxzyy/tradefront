import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hashPassword, readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { database } from "@/lib/mongodb";

async function owner() {
  const jar = await cookies();
  const session = await readSessionToken(jar.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET);
  if (!session) return null;
  const user = await (await database()).collection("users").findOne({ email: session.email, role: "owner", active: { $ne: false } });
  return user ? session.email : null;
}

const publicUser = { projection: { passwordHash: 0 } };

export async function GET() {
  if (!await owner()) return NextResponse.json({ message: "Owner access required" }, { status: 403 });
  const users = await (await database()).collection("users").find({}, publicUser).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ data: users.map(({ _id, ...user }) => ({ id: _id.toString(), ...user })) });
}

export async function POST(request: Request) {
  if (!await owner()) return NextResponse.json({ message: "Owner access required" }, { status: 403 });
  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "owner" ? "owner" : "user";
  if (!/^\S+@\S+\.\S+$/.test(email) || !name || password.length < 8) {
    return NextResponse.json({ message: "Nama, email valid, dan password minimal 8 karakter wajib diisi." }, { status: 422 });
  }
  try {
    await (await database()).collection("users").insertOne({ name, email, passwordHash: await hashPassword(password), role, active: true, createdAt: new Date(), lastLoginAt: null });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) return NextResponse.json({ message: "Email sudah digunakan." }, { status: 409 });
    throw error;
  }
}

export async function PATCH(request: Request) {
  const currentOwner = await owner();
  if (!currentOwner) return NextResponse.json({ message: "Owner access required" }, { status: 403 });
  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ message: "Email wajib diisi." }, { status: 422 });
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.active === "boolean") update.active = body.active;
  if (body.role === "owner" || body.role === "user") update.role = body.role;
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim().slice(0, 80);
  if (typeof body.password === "string" && body.password.length >= 8) update.passwordHash = await hashPassword(body.password);
  if (email === currentOwner && (update.active === false || update.role === "user")) {
    return NextResponse.json({ message: "Owner tidak dapat menonaktifkan atau menurunkan role akunnya sendiri." }, { status: 422 });
  }
  await (await database()).collection("users").updateOne({ email }, { $set: update });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const currentOwner = await owner();
  if (!currentOwner) return NextResponse.json({ message: "Owner access required" }, { status: 403 });
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email || email === currentOwner) return NextResponse.json({ message: "Akun owner aktif tidak dapat dihapus." }, { status: 422 });
  const db = await database();
  await Promise.all([db.collection("users").deleteOne({ email }), db.collection("user_progress").deleteOne({ email })]);
  return NextResponse.json({ ok: true });
}
