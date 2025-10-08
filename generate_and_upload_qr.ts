// generate_and_upload_qr.ts
// Usage:
// SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> deno run --allow-net --allow-env --allow-read generate_and_upload_qr.ts --bucket=qr-codes --public=true --concurrency=3

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.33.0";
import QRCode from "npm:qrcode@1.5.1";
import { argv, exit } from "node:process";

type QRRow = { id: string; order_id: string | null; qr_code_data: string | null };

function parseArgs() {
  const args = Object.fromEntries(
    argv.slice(2).map((a) => {
      const [k, v] = a.split("=");
      return [k.replace(/^--/, ""), v ?? "true"];
    })
  );
  return {
    bucket: (args.bucket as string) || Deno.env.get("SUPABASE_QR_BUCKET") || "qr-codes",
    makePublic: (args.public as string) !== "false",
    limit: parseInt((args.limit as string) || "1000", 10),
    concurrency: Math.max(1, parseInt((args.concurrency as string) || "1", 10)),
  };
}

const { bucket, makePublic, limit, concurrency } = parseArgs();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.");
  exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function fetchMissingQRCodes(): Promise<QRRow[]> {
  const { data, error } = await supabase
    .from("qr_codes")
    .select("id, order_id, qr_code_data")
    .is("qr_code_image_url", null)
    .limit(limit);

  if (error) throw error;
  return (data as QRRow[]) || [];
}

async function generatePNGBuffer(text: string): Promise<Uint8Array> {
  const buf = await QRCode.toBuffer(text, { type: "png", errorCorrectionLevel: "M", margin: 1, width: 500 });
  return Uint8Array.from(buf as Buffer);
}

async function uploadAndGetUrl(bucketName: string, objectName: string, data: Uint8Array): Promise<string> {
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(objectName, data, { cacheControl: "3600", upsert: true, contentType: "image/png" });

  if (uploadError) throw uploadError;

  if (makePublic) {
    const { data: pub, error: pubErr } = await supabase.storage.from(bucketName).createPublicUrl(objectName);
    if (pubErr) throw pubErr;
    return pub.publicUrl;
  } else {
    const { data: signed, error: signedErr } = await supabase.storage.from(bucketName).createSignedUrl(objectName, 60 * 60 * 24 * 7);
    if (signedErr) throw signedErr;
    return signed.signedUrl;
  }
}

async function updateQRCodeRow(qrId: string, imageUrl: string) {
  const { error } = await supabase.from("qr_codes").update({ qr_code_image_url: imageUrl }).eq("id", qrId);
  if (error) throw error;
}

async function ordersHasColumnQrCodeImageUrl(): Promise<boolean> {
  // Query Postgres catalog to check for column existence
  const { data, error } = await supabase.rpc('pg_column_exists_check', { schemaname: 'public', tablename: 'orders', columnname: 'qr_code_image_url' }).catch(() => ({ data: null, error: null }));
  // The above rpc won't exist by default; instead run direct SQL via the SQL API using supabase.from? We'll use direct SQL via the database by selecting from information_schema.
  const raw = await supabase
    .from('orders')
    .select('id')
    .limit(1);

  // If the select succeeded, we still need column check: run a raw SQL query
  const sql = `SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'qr_code_image_url'
  ) AS exists;`;

  const { data: colData, error: colErr } = await supabase.rpc('sql', { q: sql }).catch(() => ({ data: null, error: null }));

  // Supabase client doesn't expose a generic sql RPC by default. Instead we will call the SQL using the REST endpoint via fetch.
  // Fallback: call the REST endpoint _rpc is not available; so we'll use the Postgres SELECT via from('orders').select('qr_code_image_url').limit(0) to infer.
  try {
    const probe = await supabase.from('orders').select('qr_code_image_url').limit(1);
    // If error indicates column does not exist, return false; otherwise true
    if (probe.error) {
      const msg = String(probe.error.message || probe.error);
      if (msg.includes('column') && msg.includes('does not exist')) return false;
      // unknown error -> assume false to be safe
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function updateOrderIfColumnExists(orderId: string | null, imageUrl: string) {
  if (!orderId) return;
  // Update orders.qr_code_image_url only if column exists
  const hasCol = await ordersHasColumnQrCodeImageUrl();
  if (!hasCol) return;
  const { error } = await supabase.from("orders").update({ qr_code_image_url: imageUrl }).eq("id", orderId);
  if (error) throw error;
}

// Simple concurrency pool
async function workerPool<T, R>(items: T[], worker: (item: T) => Promise<R>, poolSize: number) {
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  for (const item of items) {
    const p = (async () => {
      const r = await worker(item);
      results.push(r);
    })();
    executing.push(p);
    if (executing.length >= poolSize) {
      await Promise.race(executing).catch(() => {});
      // remove settled
      for (let i = executing.length - 1; i >= 0; i--) {
        if ((executing[i] as any).resolved) executing.splice(i, 1);
      }
      // simpler: await Promise.allSettled and clear
      // but to keep it simple, we'll await Promise.race above and continue
    }
  }
  await Promise.allSettled(executing);
  return results;
}

async function processRow(row: QRRow) {
  const payload = row.qr_code_data ?? row.id;
  const png = await generatePNGBuffer(payload);
  const objectName = `qr_codes/${row.id}.png`;
  const imageUrl = await uploadAndGetUrl(bucket, objectName, png);
  await updateQRCodeRow(row.id, imageUrl);
  await updateOrderIfColumnExists(row.order_id, imageUrl);
  return { id: row.id, order_id: row.order_id, imageUrl };
}

async function run() {
  console.log(`Fetching up to ${limit} qr_codes without image URL...`);
  const rows = await fetchMissingQRCodes();
  console.log(`Found ${rows.length} rows.`);

  const results: Array<{ id: string; order_id: string | null; imageUrl: string; error?: string }> = [];

  // Sequential if concurrency <=1
  if (concurrency <= 1) {
    for (const row of rows) {
      try {
        console.log(`Processing id=${row.id} order=${row.order_id}`);
        const res = await processRow(row);
        console.log(`Done: ${res.imageUrl}`);
        results.push(res);
      } catch (err) {
        console.error(`Failed id=${row.id}:`, err);
        results.push({ id: row.id, order_id: row.order_id, imageUrl: '', error: String(err) });
      }
    }
  } else {
    // Concurrency: simple pool using Promise.all with chunks
    const chunkSize = concurrency;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const promises = chunk.map((r) =>
        processRow(r)
          .then((res) => ({ ...res }))
          .catch((err) => ({ id: r.id, order_id: r.order_id, imageUrl: '', error: String(err) }))
      );
      const settled = await Promise.all(promises);
      results.push(...(settled as any));
    }
  }

  console.log("Completed. Summary:");
  console.table(results.map((r) => ({ id: r.id, order_id: r.order_id, imageUrl: r.imageUrl, error: r.error })));
}

if (import.meta.main) {
  run().catch((e) => {
    console.error("Fatal error:", e);
    exit(1);
  });
}