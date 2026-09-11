import * as api from 'services/api';

type Dispatch = (action: unknown) => unknown;

export interface CabinetMenuItem {
  id?: string;
  parentId?: string | null;
  order?: number;
  name?: string;
  options?: Record<string, unknown>;
  childrenCount?: number;
  depth?: number;
  hasChildren?: boolean;
  history?: unknown;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export const createCabinetMenuItem = async (
  item: CabinetMenuItem,
  dispatch: Dispatch
): Promise<CabinetMenuItem> => {
  return api.post('cabinet-menu', item, 'CABINET_MENU/CREATE', dispatch) as Promise<CabinetMenuItem>;
};

export const updateCabinetMenuItem = async (
  item: CabinetMenuItem,
  dispatch: Dispatch
): Promise<CabinetMenuItem> => {
  return api.put(`cabinet-menu/${item.id}`, item, 'CABINET_MENU/UPDATE', dispatch) as Promise<CabinetMenuItem>;
};

export const deleteCabinetMenuItem = async (
  item: CabinetMenuItem,
  dispatch: Dispatch
): Promise<unknown> => {
  return api.del(`cabinet-menu/${item.id}`, {}, 'CABINET_MENU/DELETE', dispatch);
};

export const getCabinetMenuItem = (id: string, dispatch: Dispatch): Promise<unknown> => {
  return api.get(`cabinet-menu/${id}`, 'CABINET_MENU/GET', dispatch);
};

export const sortCabinetMenuItems = async (
  items: CabinetMenuItem[],
  dispatch: Dispatch
): Promise<void> => {
  await api.post('cabinet-menu/sort', { items }, 'CABINET_MENU/SORT', dispatch);
};
