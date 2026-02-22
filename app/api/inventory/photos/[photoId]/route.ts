import { NextResponse } from "next/server";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ photoId: string }> | { photoId: string } }
) {
  const { photoId } = await Promise.resolve(params);
  const accessKeyId =
    process.env.WASABI_ACCESS_KEY_ID ?? process.env.WASABI_ACCESS_KEY;
  const secretAccessKey =
    process.env.WASABI_SECRET_ACCESS_KEY ?? process.env.WASABI_SECRET_KEY;
  const region = process.env.WASABI_REGION;
  const bucket = process.env.WASABI_BUCKET;
  const endpoint = process.env.WASABI_ENDPOINT;
  if (!accessKeyId || !secretAccessKey || !region || !bucket || !endpoint) {
    return NextResponse.json(
      { error: "Wasabi is not configured. Set WASABI_ACCESS_KEY, WASABI_SECRET_KEY, WASABI_REGION, WASABI_BUCKET, WASABI_ENDPOINT." },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const { account } = await getCurrentAccountForUser(supabase);
  if (!account) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: photo } = await supabase
    .from("inventory_photos")
    .select("id, object_key")
    .eq("account_id", account.id)
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: photo.object_key }));
  } catch {
    // If object removal fails, still allow DB delete so users can clean up the gallery.
  }

  const { error: deleteErr } = await supabase
    .from("inventory_photos")
    .delete()
    .eq("account_id", account.id)
    .eq("id", photoId);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
