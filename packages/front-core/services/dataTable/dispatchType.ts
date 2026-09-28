export default (sourceName: string, type?: string): string => ['DATA_TABLE', sourceName.toUpperCase(), type].filter(Boolean).join('/');
