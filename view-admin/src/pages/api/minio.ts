import fs from "fs";
import { formidable } from "formidable";
import { Client } from "minio";
import { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
  },
};

const minioClient = new Client({
  endPoint: process.env.NEXT_PUBLIC_ENDPOINT || "",
  port: Number(process.env.NEXT_PUBLIC_PORT) || 9000,
  accessKey: process.env.NEXT_PUBLIC_ACCESS_KEY || "",
  secretKey: process.env.NEXT_PUBLIC_SECRET_KEY || "",
  useSSL: false,
});

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

    form.parse(req, async (err: any, files: any) => {
      if (err) {
        console.error("Error parsing form:", err);
        return res.status(400).json({ message: "Form parsing error" });
      }

      const fileArray = Array.isArray(files.file) ? files.file : [files.file];
      const file = fileArray[0];

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const bucketName = "bingo";
      const fileName = file.originalFilename;

      if (!fileName) {
        return res.status(400).json({ message: "file name is missing" });
      }
      if (!bucketName) {
        return res.status(400).json({ message: "bucket name is missing" });
      }

      const mimetype = file.mimetype;
      const metaData = {
        "Content-Type": mimetype,
      };

      try {
        const response = await minioClient.putObject(
          bucketName,
          fileName,
          fs.createReadStream(file.filepath),
          undefined,
          metaData,
        );
        return res.status(200).json({ message: "Upload successful" });
      } catch (uploadError) {
        return res.status(500).json({ message: uploadError });
      }
    });
  } else {
    return res
      .status(405)
      .json({ message: `Method ${req.method} Not Allowed` });
  }
}
