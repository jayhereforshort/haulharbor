import { NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountForUser } from "@/lib/account";

export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getObjectUrl(endpoint: string, bucket: string, objectKey: string) {
  const publicBase = process.env.WASABI_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (publicBase) return `${publicBase}/${objectKey}`;
  return `${endpoint.replace(/\/$/, "")}/${bucket}/${objectKey}`;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        itemId?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
      }
    | null;

  if (!body?.itemId || !body.fileName) {
    return NextResponse.json({ error: "Missing itemId or fileName." }, { status: 400 });
  }
  if ((body.fileSize ?? 0) > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 25MB)." }, { status: 400 });
  }
  const contentType = body.fileType || "application/octet-stream";
  if (body.fileType && !ALLOWED_IMAGE_TYPES.has(body.fileType)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF." },
      { status: 400 }
    );
  }

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

  const { data: item } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("account_id", account.id)
    .eq("id", body.itemId)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: "Inventory item not found." }, { status: 404 });

  const objectKey = `accounts/${account.id}/inventory/${body.itemId}/${Date.now()}-${sanitizeFileName(
    body.fileName
  )}`;

  const s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const objectUrl = getObjectUrl(endpoint, bucket, objectKey);

  return NextResponse.json({ uploadUrl, objectKey, objectUrl });
}
