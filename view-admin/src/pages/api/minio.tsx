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
  // CORSを設定
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // OPTIONSリクエストに対応
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method === "POST") {
    const form = formidable();

    form.parse(req, async (err, fields, files: any) => {
      if (err) {
        throw new Error("Error parsing form", err);
      }

      console.log("Fields:", fields);
      console.log("Files:", files);

      const bucketName = "bingo";
      const fileName = files.file[0].originalFilename;
      const file = files.file[0];
      const mimetype = file.mimetype;
      const metaData = {
        "Content-Type": mimetype,
      };

      try {
        const response = await minioClient.putObject(
          bucketName,
          fileName,
          fs.createReadStream(files.file[0].filepath),
          undefined,
          metaData,
        );
      } catch (err) {
        res.status(400).json({ message: "失敗" });
        throw new Error("Error uploading file (" + err + ")");
      }
      return res.status(200).json({ message: "成功" });
    });
  }

  if (req.method === "GET") {
    try {
      const bucketName = "bingo";
      const objectName = "go.png";
      const filePath = "/tmp/go.png";

      await minioClient.fGetObject(bucketName, objectName, filePath);
      res.status(200).json({ message: "成功" });
    } catch (err) {
      res.status(400).json({ message: "失敗" });
      throw new Error("Error downloading file (" + err + ")");
    }
  } else {
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
