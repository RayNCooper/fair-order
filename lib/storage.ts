// ── Image Storage Provider Abstraction ──
// Supports providers via STORAGE_PROVIDER env var:
//   "bunny"   — Bunny.net edge storage + CDN (default in production)
//   "minio"   — S3-compatible local storage via MinIO (default for docker dev)
//   "console" — Logs to console, returns placeholder (default in development)

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ── Provider implementations ──

async function uploadViaBunny(
  file: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const apiKey = process.env.BUNNY_STORAGE_API_KEY;
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const region = process.env.BUNNY_STORAGE_REGION;
  const cdnUrl = process.env.NEXT_PUBLIC_BUNNY_CDN_URL;

  if (!apiKey || !zone || !cdnUrl) {
    throw new Error(
      "BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_ZONE, and NEXT_PUBLIC_BUNNY_CDN_URL " +
        "are required when STORAGE_PROVIDER=bunny. Set them in your .env file."
    );
  }

  const baseHostname = "storage.bunnycdn.com";
  const hostname = region ? `${region}.${baseHostname}` : baseHostname;
  const url = `https://${hostname}/${zone}/${path}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: apiKey,
      "Content-Type": contentType,
    },
    body: new Uint8Array(file),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Bunny upload failed (${res.status}): ${text}`);
  }

  // Return the CDN URL for the uploaded file
  return `${cdnUrl.replace(/\/+$/, "")}/${path}`;
}

async function uploadViaMinio(
  file: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000";
  const accessKey = process.env.MINIO_ACCESS_KEY || "fairorder";
  const secretKey = process.env.MINIO_SECRET_KEY || "fairorder";
  const bucket = process.env.MINIO_BUCKET || "fairorder-images";
  const publicUrl = process.env.NEXT_PUBLIC_MINIO_URL || endpoint;

  // S3-compatible PUT using presigned-style basic auth header
  const date = new Date().toUTCString();
  const resource = `/${bucket}/${path}`;

  // Simple S3 v2 signature
  const { createHmac } = await import("crypto");
  const stringToSign = `PUT\n\n${contentType}\n${date}\n${resource}`;
  const signature = createHmac("sha1", secretKey)
    .update(stringToSign)
    .digest("base64");

  const res = await fetch(`${endpoint}${resource}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      Date: date,
      Authorization: `AWS ${accessKey}:${signature}`,
    },
    body: new Uint8Array(file),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`MinIO upload failed (${res.status}): ${text}`);
  }

  return `${publicUrl.replace(/\/+$/, "")}/${bucket}/${path}`;
}

function uploadViaConsole(
  file: Buffer,
  path: string,
  contentType: string
): string {
  console.log(
    `\n📸 [STORAGE] Upload: ${path}\n` +
      `   Type: ${contentType}\n` +
      `   Size: ${(file.length / 1024).toFixed(1)} KB\n`
  );
  return `/placeholder-food.svg`;
}

// ── Public API ──

function getProvider(): string {
  const provider = process.env.STORAGE_PROVIDER;
  if (provider) return provider;
  return process.env.NODE_ENV === "production" ? "bunny" : "console";
}

export function validateImageFile(
  contentType: string,
  size: number
): string | null {
  if (!ALLOWED_TYPES.includes(contentType)) {
    return "Nur JPEG, PNG und WebP Bilder sind erlaubt.";
  }
  if (size > MAX_FILE_SIZE) {
    return "Das Bild darf maximal 5 MB groß sein.";
  }
  return null;
}

export async function uploadImage(
  file: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const provider = getProvider();

  switch (provider) {
    case "bunny":
      return uploadViaBunny(file, path, contentType);
    case "minio":
      return uploadViaMinio(file, path, contentType);
    case "console":
      return uploadViaConsole(file, path, contentType);
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER: "${provider}". Use "bunny", "minio", or "console".`
      );
  }
}
