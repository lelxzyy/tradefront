import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { database } from "@/lib/mongodb";

export async function GET() {
  const session = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const keys = await (await database()).collection("provider_keys")
    .find({ provider: "twelvedata", active: true }, { projection: { used: 1, limit: 1, remaining: 1, usageCheckedAt: 1 } })
    .toArray();
  const measured = keys.filter((key) => typeof key.limit === "number");
  const limit = measured.reduce((sum, key) => sum + Number(key.limit || 0), 0);
  const used = measured.reduce((sum, key) => sum + Number(key.used || 0), 0);
  const remaining = measured.reduce((sum, key) => sum + Number(key.remaining || 0), 0);
  const checkedAt = measured.map((key) => key.usageCheckedAt).filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return NextResponse.json({
    data: {
      used, limit, remaining,
      percent_used: limit > 0 ? Math.round((used / limit) * 1000) / 10 : 0,
      plan: `${measured.length} KEY POOL`,
      checked_at: checkedAt || new Date().toISOString(),
      keys_total: keys.length,
      keys_measured: measured.length,
    },
  });
}
