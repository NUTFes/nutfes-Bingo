import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl =
  process.env.SUPABASE_INTERNAL_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const ensureBucketExists = async (bucketName: string): Promise<boolean> => {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("[upload API] Failed to list buckets:", listError);
    return false;
  }

  const bucketExists = buckets?.some((b) => b.name === bucketName);

  if (bucketExists) {
    return true;
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, {
    public: true,
  });

  if (createError) {
    console.error("[upload API] Failed to create bucket:", createError);
    return false;
  }

  return true;
};

export const POST = async (request: Request) => {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { message: "Supabase environment variables are missing" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const bucketName =
      process.env.SUPABASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
      "bingo";
    const fileName = file.name;

    if (!fileName) {
      return NextResponse.json({ message: "file name is missing" }, { status: 400 });
    }

    const bucketReady = await ensureBucketExists(bucketName);
    if (!bucketReady) {
      return NextResponse.json(
        { message: `Failed to ensure bucket "${bucketName}" exists` },
        { status: 500 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const safeFileName = `${Date.now()}_${fileName}`.replace(/[^a-zA-Z0-9._-]/g, "_");

    const { error } = await supabase.storage.from(bucketName).upload(safeFileName, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

    if (error) {
      console.error("Supabase Storage upload error:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        {
          message: error.message,
          error: process.env.NODE_ENV !== "production" ? error : undefined,
          statusCode: (error as { statusCode?: string }).statusCode,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Upload successful",
      bucketName,
      fileName: safeFileName,
    });
  } catch (uploadError) {
    console.error("Supabase upload error:", uploadError);
    return NextResponse.json({ message: String(uploadError) }, { status: 500 });
  }
};
