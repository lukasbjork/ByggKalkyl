import { DocumentType } from "@prisma/client";

/** Identifiera dokumenttyp utifrån filändelse. */
export function detectDocumentType(filename: string): DocumentType {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "ifc":
      return DocumentType.IFC;
    case "pdf":
      return DocumentType.PDF;
    case "xlsx":
    case "xls":
      return DocumentType.EXCEL;
    default:
      return DocumentType.OTHER;
  }
}

/** Tillåtna filändelser för uppladdning (UI-hint + serverkontroll). */
export const ACCEPTED_UPLOAD_EXTENSIONS = [".ifc", ".pdf", ".xlsx", ".xls"];

/** Maxstorlek per fil (MVP-gräns). IFC/ritningar kan vara stora. */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
