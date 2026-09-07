import { Db, MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

const globalMongo = globalThis as typeof globalThis & { mongoClient?: Promise<MongoClient> };

export async function database(): Promise<Db> {
  if (!uri) throw new Error("MONGODB_URI is not configured");
  globalMongo.mongoClient ||= new MongoClient(uri).connect();
  const client = await globalMongo.mongoClient;
  return client.db(process.env.MONGODB_DB || "lelxzyy_trade");
}
