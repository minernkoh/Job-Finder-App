/**
 * Render a tailored resume or cover letter to DOCX or PDF buffers.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { TailoredResumeContent } from "@schemas";

const INK = "1a1a1a";
const ACCENT = "2f5a3f";

function hexRgb(hex: string) {
  return rgb(
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  );
}

function contactLine(content: TailoredResumeContent): string {
  const c = content.contacts ?? {};
  return [c.email, c.phone, c.location, c.linkedin, c.website]
    .filter(Boolean)
    .join("  ·  ");
}

function heading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 21,
        color: ACCENT,
        font: "Calibri",
      }),
    ],
  });
}

function bodyPara(text: string) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 20, color: INK, font: "Calibri" })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 20, color: INK, font: "Calibri" })],
  });
}

export async function renderResumeDocx(content: TailoredResumeContent): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: content.name,
          bold: true,
          size: 36,
          color: INK,
          font: "Calibri",
        }),
      ],
    }),
  ];
  if (content.headline) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: content.headline, italics: true, size: 20, color: INK, font: "Calibri" }),
        ],
      }),
    );
  }
  const contacts = contactLine(content);
  if (contacts) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: contacts, size: 18, color: INK, font: "Calibri" })],
      }),
    );
  }
  children.push(heading("Summary"), bodyPara(content.summary));
  children.push(heading("Experience"));
  for (const job of content.experience) {
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 20 },
        children: [
          new TextRun({ text: `${job.title}, ${job.company}`, bold: true, size: 21, color: INK, font: "Calibri" }),
          new TextRun({
            text: job.period ? `  ${job.period}` : "",
            size: 20,
            color: INK,
            font: "Calibri",
          }),
        ],
      }),
    );
    for (const b of job.bullets) children.push(bullet(b));
  }
  if (content.projects?.length) {
    children.push(heading("Projects"));
    for (const p of content.projects) {
      children.push(bodyPara(p.name + (p.description ? ` — ${p.description}` : "")));
      for (const b of p.bullets ?? []) children.push(bullet(b));
    }
  }
  if (content.skillGroups.length) {
    children.push(heading("Skills"));
    for (const g of content.skillGroups) {
      children.push(bodyPara(`${g.name}: ${g.skills.join(", ")}`));
    }
  }
  if (content.education?.length) {
    children.push(heading("Education"));
    for (const e of content.education) {
      children.push(
        bodyPara([e.school, e.credential, e.period].filter(Boolean).join(" — ")),
      );
    }
  }
  if (content.honours?.length) {
    children.push(heading("Honours"));
    for (const h of content.honours) children.push(bullet(h));
  }

  const doc = new Document({
    sections: [{ children }],
  });
  const buf = await Packer.toBuffer(doc);
  return Buffer.from(buf);
}

export async function renderCoverLetterDocx(
  content: TailoredResumeContent,
  company: string,
): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: content.name,
                bold: true,
                size: 28,
                font: "Calibri",
              }),
            ],
          }),
          bodyPara(`Dear ${company} hiring team,`),
          ...content.coverLetter.split(/\n+/).filter(Boolean).map(bodyPara),
          bodyPara("Sincerely,"),
          bodyPara(content.name),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

function wrapPdfLine(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function renderResumePdf(content: TailoredResumeContent): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  let page = pdf.addPage(pageSize);
  let y = 800;
  const margin = 50;
  const ink = hexRgb(INK);
  const accent = hexRgb(ACCENT);

  const ensure = (need: number) => {
    if (y - need < 50) {
      page = pdf.addPage(pageSize);
      y = 800;
    }
  };

  const draw = (text: string, size: number, f = font, color = ink) => {
    const lines = wrapPdfLine(text, Math.floor((pageSize[0] - margin * 2) / (size * 0.5)));
    for (const line of lines) {
      ensure(size + 6);
      page.drawText(line, { x: margin, y, size, font: f, color });
      y -= size + 4;
    }
  };

  const section = (title: string) => {
    y -= 8;
    draw(title.toUpperCase(), 11, bold, accent);
  };

  page.drawText(content.name, {
    x: margin,
    y,
    size: 18,
    font: bold,
    color: ink,
  });
  y -= 22;
  if (content.headline) draw(content.headline, 10);
  const contacts = contactLine(content);
  if (contacts) draw(contacts, 9);
  section("Summary");
  draw(content.summary, 10);
  section("Experience");
  for (const job of content.experience) {
    draw(`${job.title}, ${job.company}${job.period ? `  ${job.period}` : ""}`, 11, bold);
    for (const b of job.bullets) draw(`• ${b}`, 10);
  }
  if (content.projects?.length) {
    section("Projects");
    for (const p of content.projects) {
      draw(p.name, 11, bold);
      for (const b of p.bullets ?? []) draw(`• ${b}`, 10);
    }
  }
  if (content.skillGroups.length) {
    section("Skills");
    for (const g of content.skillGroups) draw(`${g.name}: ${g.skills.join(", ")}`, 10);
  }
  if (content.education?.length) {
    section("Education");
    for (const e of content.education) {
      draw([e.school, e.credential, e.period].filter(Boolean).join(" — "), 10);
    }
  }
  if (content.honours?.length) {
    section("Honours");
    for (const h of content.honours) draw(`• ${h}`, 10);
  }

  return Buffer.from(await pdf.save());
}

export async function renderCoverLetterPdf(
  content: TailoredResumeContent,
  company: string,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  let y = 800;
  const margin = 50;
  const ink = hexRgb(INK);
  page.drawText(content.name, { x: margin, y, size: 16, font: bold, color: ink });
  y -= 28;
  const paras = [
    `Dear ${company} hiring team,`,
    ...content.coverLetter.split(/\n+/).filter(Boolean),
    "Sincerely,",
    content.name,
  ];
  for (const p of paras) {
    for (const line of wrapPdfLine(p, 90)) {
      page.drawText(line, { x: margin, y, size: 11, font, color: ink });
      y -= 16;
    }
    y -= 10;
  }
  return Buffer.from(await pdf.save());
}

export function slugFilePart(s: string): string {
  return (s || "file").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file";
}
