import type { PageEntry } from "../core/document/DocumentState";
import { OperationCancelledError } from "../core/errors";
import { normalizeRotation } from "../core/geometry";
import { createId } from "../core/ids";
import { pdfjs, type PDFDocumentProxy } from "./pdfjs";
import { PdfPageSource, type SourceDocument } from "./PdfPageSource";

export class PdfLoadError extends Error {
  constructor(fileName: string, reason: string) {
    super(`Couldn't open ${fileName}: ${reason}`);
    this.name = "PdfLoadError";
  }
}

export interface PasswordRequest {
  readonly fileName: string;
  /** True when the previous password was wrong. */
  readonly isRetry: boolean;
}

/** Asks the user for a file's password. Resolves with null if they give up. */
export type PasswordPrompt = (request: PasswordRequest) => Promise<string | null>;

export interface LoadedPdf {
  readonly name: string;
  readonly pages: PageEntry[];
}

/** pdf.js reports why it needs a password with these codes. */
const INCORRECT_PASSWORD = 2;

/**
 * Opens a PDF file and returns one page entry per page, ready to add to a document.
 * Password-protected files ask for their password until it's right or the user cancels.
 */
export async function loadPdf(file: File, askPassword: PasswordPrompt): Promise<LoadedPdf> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await openSourceDocument(file.name, bytes, askPassword);
  const pages = await Promise.all(
    Array.from({ length: document.proxy.numPages }, (_, index) => createPageEntry(document, index)),
  );
  return { name: file.name, pages };
}

async function openSourceDocument(
  name: string,
  bytes: Uint8Array,
  askPassword: PasswordPrompt,
  password: string | null = null,
): Promise<SourceDocument> {
  try {
    const proxy = await openWithPdfjs(bytes, password);
    return { id: createId("src"), name, bytes, password, proxy };
  } catch (error) {
    if (!isPasswordError(error)) {
      throw new PdfLoadError(name, describeLoadFailure(error));
    }
    const nextPassword = await askPassword({
      fileName: name,
      isRetry: (error as { code?: number }).code === INCORRECT_PASSWORD,
    });
    if (nextPassword === null) {
      throw new OperationCancelledError(`Opening ${name}`);
    }
    return openSourceDocument(name, bytes, askPassword, nextPassword);
  }
}

function openWithPdfjs(bytes: Uint8Array, password: string | null): Promise<PDFDocumentProxy> {
  // pdf.js takes ownership of the buffer it is given, so hand it a copy each time.
  return pdfjs.getDocument({ data: bytes.slice(), password: password ?? undefined }).promise;
}

function isPasswordError(error: unknown): boolean {
  return error instanceof Error && error.name === "PasswordException";
}

async function createPageEntry(document: SourceDocument, index: number): Promise<PageEntry> {
  const page = await document.proxy.getPage(index + 1);
  const [left = 0, bottom = 0, right = 0, top = 0] = page.view;
  const source = new PdfPageSource(
    document,
    index,
    { width: right - left, height: top - bottom },
    normalizeRotation(page.rotate),
  );
  return { id: createId("page"), source, userRotation: 0 };
}

function describeLoadFailure(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  const reasons: Record<string, string> = {
    InvalidPDFException: "it doesn't look like a valid PDF.",
  };
  return reasons[name] ?? (error instanceof Error ? error.message : "unknown error.");
}
