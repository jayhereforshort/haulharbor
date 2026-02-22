import { NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";

export const runtime = "nodejs";

/** Presigned GET URL so the bucket can stay private. Redirect expires in 1 hour. */
const PRESIGN_EXPIRES_IN = 60 * 60;

export async function GET(
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
      { error: "Wasabi is not configured." },
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

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: photo.object_key,
  });
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES_IN });
  return NextResponse.redirect(signedUrl, 302);
}
