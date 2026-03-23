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

    // Generate unique filename: menu-items/{locationId}/{id}.{ext}
    const ext = EXT_MAP[file.type] || "jpg";
    const id = crypto.randomUUID().replace(/-/g, "");
    const path = `menu-items/${location.id}/${id}.${ext}`;

    // Read file into buffer and upload
    const buffer = Buffer.from(await file.arrayBuffer());
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
