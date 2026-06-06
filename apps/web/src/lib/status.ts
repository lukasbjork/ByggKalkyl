import { DocumentStatus, DocumentType, ProjectStatus } from "@prisma/client";

export const projectStatusLabel: Record<ProjectStatus, string> = {
  DRAFT: "Utkast",
  TAKEOFF: "Mängdning",
  PRICED: "Prissatt",
  CALCULATED: "Kalkylerad",
  ARCHIVED: "Arkiverad",
};

export const documentStatusLabel: Record<DocumentStatus, string> = {
  UPLOADED: "Uppladdad",
  PARSING: "Bearbetas",
  PARSED: "Klar",
  FAILED: "Fel",
};

export const documentTypeLabel: Record<DocumentType, string> = {
  IFC: "IFC",
  PDF: "PDF",
  EXCEL: "Excel",
  OTHER: "Annat",
};
