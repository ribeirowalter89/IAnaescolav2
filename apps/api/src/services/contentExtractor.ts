import fs from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import sharp from "sharp";
import { recognize } from "tesseract.js";

async function extractFromPdf(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const parsed = await pdfParse(buffer);
  return parsed.text?.trim() ?? "";
}

async function extractFromDocx(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value?.trim() ?? "";
}

async function extractFromImage(filePath: string): Promise<string> {
  const pngBuffer = await sharp(filePath).png().toBuffer();
  const { data } = await recognize(pngBuffer, "por");
  return data.text?.trim() ?? "";
}

export async function extractText(filePath: string, mimeType: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (mimeType.includes("pdf") || ext === ".pdf") {
    return extractFromPdf(filePath);
  }

  if (
    mimeType.includes("word") ||
    mimeType.includes("officedocument") ||
    ext === ".docx"
  ) {
    return extractFromDocx(filePath);
  }

  if (
    mimeType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg"].includes(ext)
  ) {
    return extractFromImage(filePath);
  }

  return "";
}