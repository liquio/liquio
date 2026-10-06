interface ReportDraftOption {
  tempate?: { ReportGuid?: string };
  name?: string;
  [key: string]: unknown;
}

export default (option: ReportDraftOption | null | undefined) =>
  option
    ? {
        ...option,
        id: option?.tempate?.ReportGuid,
        value: option?.tempate?.ReportGuid,
        label: option.name,
      }
    : null;
