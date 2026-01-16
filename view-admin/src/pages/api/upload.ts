import fs from "fs";
import formidable, { Fields, Files } from "formidable";
import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabaseUrl =
  process.env.SUPABASE_INTERNAL_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

/**
 * Ensures the specified storage bucket exists, creating it if necessary.
 * Returns true if bucket exists or was created successfully.
 */
async function ensureBucketExists(bucketName: string): Promise<boolean> {
  // Check if bucket exists
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    console.error("[upload API] Failed to list buckets:", listError);
    return false;
  }

  const bucketExists = buckets?.some((b) => b.name === bucketName);

  if (bucketExists) {
    return true;
  }

  // Create bucket if it doesn't exist
  console.log(`[upload API] Bucket "${bucketName}" not found, creating...`);
  const { error: createError } = await supabase.storage.createBucket(
    bucketName,
    {
      public: true, // Make bucket publicly accessible for reading
    },
  );

  if (createError) {
    console.error("[upload API] Failed to create bucket:", createError);
    return false;
  }

  console.log(`[upload API] Bucket "${bucketName}" created successfully`);
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    const form = formidable();
    return await new Promise<void>((resolve) => {
      form.parse(req, async (err, fields: Fields, files: Files) => {
        if (err) {
          console.error("Error parsing form:", err);
          res.status(400).json({ message: "Form parsing error" });
          return resolve();
        }

        const fileArray = Array.isArray(files.file) ? files.file : [files.file];
        const file = fileArray[0];

        if (!file) {
          res.status(400).json({ message: "No file uploaded" });
          return resolve();
        }

        const bucketName =
          process.env.SUPABASE_STORAGE_BUCKET ||
          process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
          "bingo";
        const fileName = file.originalFilename;

        if (!fileName) {
          res.status(400).json({ message: "file name is missing" });
          return resolve();
        }

        try {
          if (!supabaseUrl || !serviceRoleKey) {
            res.status(500).json({
              message: "Supabase environment variables are missing",
            });
            return resolve();
          }

          // Ensure bucket exists before uploading
          const bucketReady = await ensureBucketExists(bucketName);
          if (!bucketReady) {
            res.status(500).json({
              message: `Failed to ensure bucket "${bucketName}" exists`,
            });
            return resolve();
          }

          const fileBuffer = await fs.promises.readFile(file.filepath);
          const safeFileName = `${Date.now()}_${fileName}`.replace(
            /[^a-zA-Z0-9._-]/g,
            "_",
          );
          const { error } = await supabase.storage
            .from(bucketName)
            .upload(safeFileName, fileBuffer, {
              contentType: file.mimetype || "application/octet-stream",
              upsert: true,
            });

          if (error) {
            console.error(
              "Supabase Storage upload error:",
              JSON.stringify(error, null, 2),
            );
            console.error("Bucket:", bucketName, "File:", safeFileName);
            res.status(500).json({
              message: error.message,
              error: process.env.NODE_ENV !== "production" ? error : undefined,
              statusCode: (error as { statusCode?: string }).statusCode,
            });
            return resolve();
          }

          res.status(200).json({
            message: "Upload successful",
            bucketName,
            fileName: safeFileName,
          });
          return resolve();
        } catch (uploadError) {
          console.error("Supabase upload error:", uploadError);
          res.status(500).json({ message: String(uploadError) });
          return resolve();
        }
      });
    });
  } else {
    return res
      .status(405)
      .json({ message: `Method ${req.method} Not Allowed` });
  }
}
