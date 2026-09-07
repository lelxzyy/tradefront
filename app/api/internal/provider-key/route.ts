import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { database } from "@/lib/mongodb";
import { decryptKey } from "@/lib/key-vault";
function allowed(r:Request){const token=r.headers.get("authorization")?.replace(/^Bearer\s+/i,"");return !!token&&token===process.env.VAULT_INTERNAL_SECRET}
export async function GET(r:Request){if(!allowed(r))return NextResponse.json({message:"Unauthorized"},{status:401});const excluded=new URL(r.url).searchParams.get("exclude")?.split(",").filter(Boolean)||[];const query:any={provider:"twelvedata",active:true,$or:[{disabledUntil:{$exists:false}},{disabledUntil:{$lte:new Date()}}]};if(excluded.length)query._id={$nin:excluded.map(x=>new ObjectId(x))};const row=await (await database()).collection("provider_keys").findOne(query,{sort:{priority:1}});if(!row)return NextResponse.json({message:"No active API key"},{status:404});return NextResponse.json({id:row._id.toString(),key:await decryptKey(row.encryptedKey)})}
export async function POST(r:Request){
  if(!allowed(r))return NextResponse.json({message:"Unauthorized"},{status:401});
  const b=await r.json(); const collection=(await database()).collection("provider_keys");
  const row=await collection.findOne({_id:new ObjectId(b.id)}); if(!row)return NextResponse.json({message:"Key not found"},{status:404});
  let reset=new Date(Date.now()+65_000), reason="Per-minute rate limit";
  try{
    const plain=await decryptKey(row.encryptedKey);
    const response=await fetch("https://api.twelvedata.com/api_usage",{headers:{Authorization:`apikey ${plain}`},cache:"no-store"});
    const usage=await response.json(); const used=Number(usage.daily_usage||0),limit=Number(usage.plan_daily_limit||0);
    if(limit>0&&used>=limit){reset=new Date();reset.setUTCDate(reset.getUTCDate()+1);reset.setUTCHours(0,2,0,0);reason="Daily credits exhausted";}
    await collection.updateOne({_id:row._id},{$set:{used,limit,remaining:Math.max(0,limit-used),usageCheckedAt:new Date()}});
  }catch{}
  await collection.updateOne({_id:row._id},{$set:{lastError:reason,lastFailedAt:new Date(),disabledUntil:reset}});
  return NextResponse.json({ok:true,retryAt:reset,reason});
}
