// generate_and_upload_qr.js

// Usage: SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node generate_and_upload_qr.js --bucket=qr-codes --public=true

import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import fs from "fs/promises";
import process from "process";
import path from "path";

const argv = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v] = arg.split("=");
    return [k.replace(/^--/, ""), v ?? true];
  })
);

const BUCKET = argv.bucket || process.env.SUPABASE_QR_BUCKET || "qr-codes";
const MAKE_PUBLIC = argv.public === "false" ? false : true;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function fetchMissingQRCodes() {
  // Fetch minimal columns
  const { data, error } = await supabase
    .from("qr_codes")
    .select("id, order_id, qr_code_data")
    .is("qr_code_image_url", null)
    .limit(1000);

  if (error) throw error;
  return data || [];
}

async function generatePNGBuffer(text) {
  // qrcode.toBuffer returns a Buffer (PNG)
  return QRCode.toBuffer(text, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 500,
  });
}

function publicUrlForObject(bucket, objectName) {
  // Default Supabase public URL format:
  // `${SUPABASE_URL.replace(/\.co$/, '')}/storage/v1/object/public/${bucket}/${encodeURIComponent(objectName)}`
  // But safer to use the client to getPublicUrl below.
  return `${bucket}/${objectName}`;
}

async function uploadAndMakePublic(bucket, objectName, buffer) {
  // Upload
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectName, buffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: "image/png",
    });

  if (uploadError) throw uploadError;

  if (MAKE_PUBLIC) {
    // Set object public (if bucket is private, this will create a public URL)
    // Note: Public behavior depends on bucket settings. We will request a public URL via createSignedUrl or getPublicUrl.
    const { data: pub } = await supabase.storage
      .from(bucket)
      .getPublicUrl(objectName);
    if (!pub) throw new Error("Failed to get public URL");
    return pub.publicUrl;
  } else {
    // Create signed URL valid for 7 days (604800 seconds)
    const { data: signed, error: signedErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectName, 60 * 60 * 24 * 7);
    if (signedErr) throw signedErr;
    return signed.signedUrl;
  }
}

async function updateQRCodeRow(qrId, imageUrl) {
  const { data, error } = await supabase
    .from("qr_codes")
    .update({ qr_code_image_url: imageUrl })
    .eq("id", qrId)
    .select("id, order_id, qr_code_image_url")
    .single();

  if (error) throw error;
  return data;
}

(async () => {
  try {
    console.log("Fetching qr_codes missing image URL...");
    const rows = await fetchMissingQRCodes();
    console.log(`Found ${rows.length} rows to process.`);

    const results = [];

    for (const row of rows) {
      console.log(`Processing qr_code id=${row.id} order=${row.order_id}`);
      const png = await generatePNGBuffer(row.qr_code_data || row.id);
      const objectName = `qr_codes/${row.id}.png`;
      const imageUrl = await uploadAndMakePublic(BUCKET, objectName, png);
      const updated = await updateQRCodeRow(row.id, imageUrl);
      console.log(`Uploaded and updated: ${imageUrl}`);
      results.push({ id: row.id, order_id: row.order_id, imageUrl });
    }

    console.log("Done. Summary:");
    console.table(results);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
