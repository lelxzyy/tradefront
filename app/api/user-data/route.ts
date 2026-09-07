import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { database } from "@/lib/mongodb";

const sections = new Set(["journal", "brokerSettings", "calculatorSettings"]);
const histories = new Set(["aiHistory", "signalHistory"]);

async function currentEmail() {
  const jar = await cookies();
  return (await readSessionToken(jar.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET))?.email;
}

export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const data = await (await database()).collection("user_progress").findOne({ email }, { projection: { _id: 0, email: 0 } });
  return NextResponse.json({ data: data || {} });
}

export async function PATCH(request: Request) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (JSON.stringify(body).length > 750_000) return NextResponse.json({ message: "Data terlalu besar" }, { status: 413 });
  const db = await database();
  const collection = db.collection("user_progress");

  if (body.action === "set" && sections.has(body.section)) {
    await collection.updateOne({ email }, { $set: { [body.section]: body.value, updatedAt: new Date() }, $setOnInsert: { email, createdAt: new Date() } }, { upsert: true });
  } else if (body.action === "append" && histories.has(body.section)) {
    await collection.updateOne({ email }, { $push: { [body.section]: { $each: [{ ...body.value, savedAt: new Date() }], $position: 0, $slice: body.section === "aiHistory" ? 50 : 100 } } as never, $set: { updatedAt: new Date() }, $setOnInsert: { email, createdAt: new Date() } }, { upsert: true });
  } else {
    return NextResponse.json({ message: "Operasi tidak valid" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
