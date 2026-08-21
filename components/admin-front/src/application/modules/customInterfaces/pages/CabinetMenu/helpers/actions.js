import * as api from "services/api";

export const createCabinetMenuItem = async (item, dispatch) => {
  return api.post("cabinet-menu", item, "CABINET_MENU/CREATE", dispatch);
};

export const updateCabinetMenuItem = async (item, dispatch) => {
  return api.put(`cabinet-menu/${item.id}`, item, "CABINET_MENU/UPDATE", dispatch);
};

export const deleteCabinetMenuItem = async (item, dispatch) => {
  return api.del(`cabinet-menu/${item.id}`, {}, "CABINET_MENU/DELETE", dispatch);
};

export const getCabinetMenuItem = (id, dispatch) => {
  return api.get(`cabinet-menu/${id}`, "CABINET_MENU/GET", dispatch);
};

export const sortCabinetMenuItems = async (items, dispatch) => {
  await api.post("cabinet-menu/sort", { items }, "CABINET_MENU/SORT", dispatch);
};
