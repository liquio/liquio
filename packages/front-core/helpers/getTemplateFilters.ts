interface TemplateFiltersInput {
  docType?: unknown;
  docTypeCourts?: unknown;
  [key: string]: unknown;
}

export default ({ docType, docTypeCourts }: TemplateFiltersInput) => ({ docType, docTypeCourts });
