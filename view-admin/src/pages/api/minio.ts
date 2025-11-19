import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize S3 client for RustFS
const s3Client = new S3Client({
  endpoint: `http://${process.env.NEXT_PUBLIC_ENDPOINT}:${process.env.NEXT_PUBLIC_PORT || 9000}`,
  region: "us-east-1", // RustFS requires a region but doesn't validate it
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_ACCESS_KEY || "",
    secretAccessKey: process.env.NEXT_PUBLIC_SECRET_KEY || "",
  },
  forcePathStyle: true, // Required for S3-compatible services
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({});
  const bucketName = process.env.NEXT_PUBLIC_BUCKET_NAME || "bingo";

  try {
    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileName = file.originalFilename || "unnamed";
    // RustFS doesn't handle streams well, read file as buffer instead
    const fileBuffer = fs.readFileSync(file.filepath);

    // Upload to RustFS using AWS SDK v3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: file.mimetype || "application/octet-stream",
    });

    await s3Client.send(command);

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      message: "File uploaded successfully",
      fileName,
      bucketName,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      error: "Upload failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
