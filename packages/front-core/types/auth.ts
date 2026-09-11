export type UnitMembership<T> = {
  all: T[] | Record<string, T>;
  head: T[] | Record<string, T>;
  member: T[] | Record<string, T>;
};

/** Profile returned by auth/me; optional/null fields reflect partial identity providers. */
export interface AuthUser {
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  isLegal?: boolean | null;
  isIndividualEntrepreneur?: boolean | null;
  authUserRoles?: string[] | Record<string, string>;
  courtIdUserScopes?: string[] | Record<string, string>;
  authUserUnits?: UnitMembership<string>;
  authUserUnitIds?: UnitMembership<number>;
  valid?: {
    email?: boolean | null;
    phone?: boolean | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface LoginResponse {
  token: string;
  [key: string]: unknown;
}
