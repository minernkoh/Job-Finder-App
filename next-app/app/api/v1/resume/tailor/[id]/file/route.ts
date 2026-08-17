/**
 * GET /api/v1/resume/tailor/:id/file?kind=resume|cover&format=docx|pdf
 * Streams a generated document. Requires auth; the tailor record must belong to the user.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { getTailoredResumeForUser } from "@/lib/services/tailor.service";
import {
  renderCoverLetterDocx,
  renderCoverLetterPdf,
  renderResumeDocx,
  renderResumePdf,
  slugFilePart,
} from "@/lib/services/resume-render.service";

export const maxDuration = 60;

async function getFileHandler(
  request: NextRequest,
  payload: { sub: string },
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const kind = request.nextUrl.searchParams.get("kind") === "cover" ? "cover" : "resume";
  const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "docx";

  const record = await getTailoredResumeForUser(payload.sub, id);
  if (!record) {
    return NextResponse.json(
      { success: false, message: "Tailored resume not found" },
      { status: 404 },
    );
  }

  let buffer: Buffer;
  if (kind === "cover") {
    buffer =
      format === "pdf"
        ? await renderCoverLetterPdf(record.content, record.listingCompany)
        : await renderCoverLetterDocx(record.content, record.listingCompany);
  } else {
    buffer =
      format === "pdf"
        ? await renderResumePdf(record.content)
        : await renderResumeDocx(record.content);
  }

  const slug = `${slugFilePart(record.listingCompany)}-${slugFilePart(record.listingTitle)}-${kind}`;
  const filename = `${slug}.${format}`;
  const contentType =
    format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export const GET = withAuth(getFileHandler, "Failed to download tailored file");
