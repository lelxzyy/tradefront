import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { database } from "@/lib/mongodb";
import { decryptKey, encryptKey, maskKey } from "@/lib/key-vault";
async function isOwner() { const s = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET); return s && await (await database()).collection("users").findOne({ email:s.email, role:"owner", active:{$ne:false} }); }
export async function GET(request: Request) {
  if (!await isOwner()) return NextResponse.json({message:"Owner access required"},{status:403});
  const rows=await (await database()).collection("provider_keys").find({provider:"twelvedata"}).sort({priority:1}).toArray();
  const collection=(await database()).collection("provider_keys");
  const force=new URL(request.url).searchParams.get("refresh")==="1";
  const data=await Promise.all(rows.map(async ({_id,encryptedKey,...x})=>{
    const plain=await decryptKey(encryptedKey); let usage:any={};
    const fresh=x.usageCheckedAt&&Date.now()-new Date(x.usageCheckedAt).getTime()<60_000;
    if(!force&&fresh)usage={used:x.used,limit:x.limit,remaining:x.remaining,usageCheckedAt:x.usageCheckedAt};
    else try { const response=await fetch("https://api.twelvedata.com/api_usage",{headers:{Authorization:`apikey ${plain}`},cache:"no-store"}); const u=await response.json(); if(response.ok&&u.plan_daily_limit){usage={used:Number(u.daily_usage),limit:Number(u.plan_daily_limit),remaining:Math.max(0,Number(u.plan_daily_limit)-Number(u.daily_usage)),usageCheckedAt:new Date()};await collection.updateOne({_id},{$set:usage});} } catch {}
    return {id:_id.toString(),...x,...usage,maskedKey:maskKey(plain)};
  }));
  return NextResponse.json({data});
}
export async function POST(r:Request){if(!await isOwner())return NextResponse.json({message:"Owner access required"},{status:403});const b=await r.json();const key=String(b.key||"").trim();if(key.length<20)return NextResponse.json({message:"API key tidak valid"},{status:422});const c=(await database()).collection("provider_keys");await c.insertOne({provider:"twelvedata",label:String(b.label||"Twelve Data key").slice(0,60),encryptedKey:await encryptKey(key),active:true,priority:await c.countDocuments({provider:"twelvedata"})+1,createdAt:new Date()});return NextResponse.json({ok:true},{status:201})}
export async function PATCH(r:Request){if(!await isOwner())return NextResponse.json({message:"Owner access required"},{status:403});const b=await r.json();const set:any={updatedAt:new Date()};if(typeof b.active==="boolean")set.active=b.active;if(Number.isInteger(b.priority))set.priority=b.priority;if(typeof b.label==="string")set.label=b.label.slice(0,60);if(typeof b.key==="string"&&b.key.trim().length>=20)set.encryptedKey=await encryptKey(b.key.trim());const update:any={$set:set};if(b.retry===true)update.$unset={disabledUntil:"",lastError:"",lastFailedAt:""};await (await database()).collection("provider_keys").updateOne({_id:new ObjectId(b.id)},update);return NextResponse.json({ok:true})}
export async function DELETE(r:Request){if(!await isOwner())return NextResponse.json({message:"Owner access required"},{status:403});const id=new URL(r.url).searchParams.get("id");if(!id)return NextResponse.json({message:"ID required"},{status:422});await (await database()).collection("provider_keys").deleteOne({_id:new ObjectId(id)});return NextResponse.json({ok:true})}
