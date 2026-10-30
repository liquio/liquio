/**
 * Builds an element id. The layouts default to `() => null` (no id), which is why the result can be `null`;
 * `LoginPage` always passes `setComponentsId('login')`, so in the app it is a string.
 */
export type LoginSetId = (elementName: string) => string | null;

/** What the `local` and `ldap` provider buttons hand to `CredentialMethod`. */
export interface CredentialAdditionalProps {
  method?: string;
  email?: string;
  password?: string;
}

/**
 * `false` is the main page, `true` or an object is the credential form. `undefined` happens because
 * `CredentialMethod` calls `onClose()` without an argument, and `onClose` is the state setter itself.
 */
export type CredentialMethodState = boolean | CredentialAdditionalProps | undefined;

/** The props `LoginPage` passes to the layout, and the layout passes on to every step. */
export interface LoginStepProps {
  setId?: LoginSetId;
  auth?: boolean;
  onSignHash?: unknown;
  getDataToSign?: unknown;
  onSelectKey?: unknown;
}
