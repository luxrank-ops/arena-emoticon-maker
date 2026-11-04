import { Redis } from "@upstash/redis";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
  console.error("Missing Upstash KV credentials.");
  process.exit(1);
}

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error("Missing Firebase credentials.");
  process.exit(1);
}

const kv = new Redis({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});

const app = initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY,
  }),
});
const db = getFirestore(app);

async function migrate() {
  console.log("=== Upstash KV to Firestore Migration Started ===");
  const keys = await kv.keys("*");
  console.log(`Found ${keys.length} keys in KV.`);

  let count = 0;
  for (const key of keys) {
    const val = await kv.get(key);
    // Emotime store path format used in app: emotime/store
    // We will save to emotime/store with the serialized format or direct mapping
    await db.doc("emotime/store").set({
      [key]: val
    }, { merge: true });
    count++;
    console.log(`[${count}/${keys.length}] Migrated key: ${key}`);
  }
  console.log("=== Migration Completed Successfully ===");
}

migrate().catch(console.error);
