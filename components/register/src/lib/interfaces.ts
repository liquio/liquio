export interface BasicFilter {
  filter?: { [key: string | symbol]: any };
  include?: any[];
  offset?: number;
  limit?: number;
  sort?: { [key: string]: 'asc' | 'desc' } | string | Array<string[]>;
  joinBy?: string;
}

export interface ModelListResponse<T> {
  data: T[];
}

export interface ModelListWithMetaResponse<T> extends ModelListResponse<T> {
  meta: { count: number; offset: number; limit: number };
}

export interface ModelItemResponse<T> {
  data: T;
}

export interface ModelUpdateResponse<T> {
  data: T;
  updating: { rowsCount: number };
}
