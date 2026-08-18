/**
 * Shared resume parse request body handling: JSON { text } or multipart PDF/DOCX.
 */

import { ParseResumeBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { validationErrorResponse } from "@/lib/api/errors";
import {
  DOCX_EXTRACT_ERROR_MESSAGE,
  extractTextFromDocx,
  extractTextFromPdf,
  MAX_FILE_BYTES,
  PDF_EXTRACT_ERROR_MESSAGE,
} from "@/lib/services/resume.service";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isPdfFile(file: { type: string; name: string }): boolean {
  return (
    file.type === "application/pdf" ||
    (!!file.name && file.name.toLowerCase().endsWith(".pdf"))
  );
}

function isDocxFile(file: { type: string; name: string }): boolean {
  return (
    file.type === DOCX_MIME ||
    (!!file.name && file.name.toLowerCase().endsWith(".docx"))
  );
}

function isResumeFile(file: { type: string; name: string }): boolean {
  return isPdfFile(file) || isDocxFile(file);
}

export { PDF_EXTRACT_ERROR_MESSAGE, DOCX_EXTRACT_ERROR_MESSAGE };

/** Reads resume text from JSON or multipart. Returns text or a 400 NextResponse. */
export async function readResumeTextFromRequest(
  request: NextRequest,
): Promise<{ ok: true; text: string } | { ok: false; response: NextResponse }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "No file provided. Use the 'file' field." },
          { status: 400 },
        ),
      };
    }
    if (!isResumeFile(file)) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            success: false,
            message: "Only PDF or DOCX files up to 5MB are supported.",
          },
          { status: 400 },
        ),
      };
    }
    if (file.size > MAX_FILE_BYTES) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "File must be 5MB or smaller." },
          { status: 400 },
        ),
      };
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = isPdfFile(file)
      ? await extractTextFromPdf(buffer)
      : await extractTextFromDocx(buffer);
    return { ok: true, text };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Request body must be JSON with a text field." },
        { status: 400 },
      ),
    };
  }
  const parsed = ParseResumeBodySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, response: validationErrorResponse(parsed.error, "Invalid body") };
  }
  const text = parsed.data.text.trim();
  if (!text) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Resume text is required." },
        { status: 400 },
      ),
    };
  }
  return { ok: true, text };
}
