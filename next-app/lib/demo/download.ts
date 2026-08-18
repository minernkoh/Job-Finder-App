/**
 * Client-side DOCX/PDF download for guest preview tailored resumes.
 */

import type { TailoredResumeContent } from "@schemas";
import { getDemoTailoredById } from "./store";

async function bufferToBlob(data: Uint8Array | ArrayBuffer | Buffer, mime: string): Promise<Blob> {
  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : Buffer.isBuffer(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return new Blob([bytes.slice()], { type: mime });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Generates and downloads a tailored resume or cover letter in preview mode. */
export async function downloadDemoTailoredFile(
  tailorId: string,
  kind: "resume" | "cover",
  format: "docx" | "pdf",
): Promise<void> {
  const tailored = getDemoTailoredById(tailorId);
  if (!tailored) throw new Error("Tailored resume not found");

  const {
    renderResumeDocx,
    renderCoverLetterDocx,
    renderResumePdf,
    renderCoverLetterPdf,
  } = await import("@/lib/services/resume-render.service");

  const content: TailoredResumeContent = tailored.content;
  const company = tailored.listingCompany ?? "the company";

  let blob: Blob;
  if (kind === "resume" && format === "docx") {
    const buf = await renderResumeDocx(content);
    blob = await bufferToBlob(buf, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  } else if (kind === "cover" && format === "docx") {
    const buf = await renderCoverLetterDocx(content, company);
    blob = await bufferToBlob(buf, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  } else if (kind === "resume" && format === "pdf") {
    const buf = await renderResumePdf(content);
    blob = await bufferToBlob(buf, "application/pdf");
  } else {
    const buf = await renderCoverLetterPdf(content, company);
    blob = await bufferToBlob(buf, "application/pdf");
  }

  triggerDownload(blob, `${kind}.${format}`);
}
