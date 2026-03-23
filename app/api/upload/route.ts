import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadImage, validateImageFile } from "@/lib/storage";
import crypto from "crypto";

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Verify file content matches claimed MIME type via magic bytes
function verifyMagicBytes(buffer: Buffer, claimedType: string): boolean {
  if (buffer.length < 4) return false;
  switch (claimedType) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    case "image/webp":
      return buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    default:
      return false;
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  try {
    const location = await db.location.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Kein Standort gefunden." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen." },
        { status: 400 }
      );
    }

    // Validate file type and size
    const validationError = validateImageFile(file.type, file.size);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Read file into buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes match claimed MIME type
    if (!verifyMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "Dateiinhalt stimmt nicht mit dem Dateityp überein." },
        { status: 400 }
      );
    }

    // Generate unique filename: menu-items/{locationId}/{id}.{ext}
    const ext = EXT_MAP[file.type] || "jpg";
    const id = crypto.randomUUID().replace(/-/g, "");
    const path = `menu-items/${location.id}/${id}.${ext}`;
    const url = await uploadImage(buffer, path, file.type);

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Bild konnte nicht hochgeladen werden." },
      { status: 500 }
    );
  }
}
