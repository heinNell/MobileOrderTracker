// generate_and_upload_qr.ts
// Usage example:
//   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> deno run --allow-net --allow-env --allow-read generate_and_upload_qr.ts --bucket=qr-codes --public=true

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.33.0";
import QRCode from "npm:qrcode@1.5.1";
import { argv } from "node:process";

type QRRow = {
  id: string;
  order_id: string | null;
  qr_code_data: string | null;
};

function parseArgs() {
  const args = Object.fromEntries(
    argv.slice(2).map((a) => {
      const [k, v] = a.split("=");
      return [k.replace(/^--/, ""), v ?? "true"];
    })
  );
  return {
    bucket:
      (args.bucket as string) ||
      Deno.env.get("SUPABASE_QR_BUCKET") ||
      "qr-codes",
    makePublic: (args.public as string) !== "false",
    limit: parseInt((args.limit as string) || "1000", 10),
  };
}

const { bucket, makePublic, limit } = parseArgs();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment."
  );
  Deno.exit(1);
}

const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
);

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
  // QRCode.toBuffer returns a Buffer in Node; in Deno we get a Buffer-like object.
  // qrcode.toBuffer works fine under npm: with Deno node-compat.
  const buf = await QRCode.toBuffer(text, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 500,
  });
  // Ensure Uint8Array
  return Uint8Array.from(buf as Buffer);
}

async function uploadAndGetUrl(
  bucketName: string,
  objectName: string,
  data: Uint8Array
): Promise<string> {
  // Upload (upsert)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(objectName, data, {
      cacheControl: "3600",
      upsert: true,
      contentType: "image/png",
    });

  if (uploadError) throw uploadError;

  if (makePublic) {
    // Create public URL
    const { data: pub, error: pubErr } = await supabase.storage
      .from(bucketName)
      .createPublicUrl(objectName);
    if (pubErr) throw pubErr;
    return pub.publicUrl;
  } else {
    // Create signed URL (7 days)
    const { data: signed, error: signedErr } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(objectName, 60 * 60 * 24 * 7);
    if (signedErr) throw signedErr;
    return signed.signedUrl;
  }
}

async function updateQRCodeRow(qrId: string, imageUrl: string) {
  const { error } = await supabase
    .from("qr_codes")
    .update({ qr_code_image_url: imageUrl })
    .eq("id", qrId);
  if (error) throw error;
}

async function run() {
  console.log(`Fetching up to ${limit} qr_codes without image URL...`);
  const rows = await fetchMissingQRCodes();
  console.log(`Found ${rows.length} rows.`);

  const results: Array<{
    id: string;
    order_id: string | null;
    imageUrl: string;
  }> = [];

  for (const row of rows) {
    try {
      const payload = row.qr_code_data ?? row.id;
      console.log(`Processing id=${row.id} (order=${row.order_id})`);
      const png = await generatePNGBuffer(payload);
      const objectName = `qr_codes/${row.id}.png`;
      const imageUrl = await uploadAndGetUrl(bucket, objectName, png);
      await updateQRCodeRow(row.id, imageUrl);
      console.log(`Uploaded and updated: ${imageUrl}`);
      results.push({ id: row.id, order_id: row.order_id, imageUrl });
    } catch (err) {
      console.error(`Failed for id=${row.id}:`, err);
    }
  }

  console.log("Done. Summary:");
  console.table(results);
}

if (import.meta.main) {
  run().catch((e) => {
    console.error("Fatal error:", e);
    Deno.exit(1);
  });
}
