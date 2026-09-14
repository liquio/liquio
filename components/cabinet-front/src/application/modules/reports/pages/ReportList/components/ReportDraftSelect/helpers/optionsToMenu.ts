interface ReportDraftOption {
  id?: string | number;
  data?: { name?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export default (option: ReportDraftOption | null) =>
  option
    ? {
        ...option.data,
        id: option.id,
        value: option.id,
        label: option.data?.name
      }
    : null;
