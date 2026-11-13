// Credentials never belong in provider profiles returned to OAuth clients or admins.
const CREDENTIAL_FIELD = /password|token|secret|authorization|assertion|privatekey|apikey/i;
const LOCAL_PUBLIC_FIELDS = ['isChangeRequired', 'passwordExpire', 'lastPasswordChangeDate'];

export function sanitizeProviderProfile(value: any): any {
  if (Array.isArray(value)) return value.map(sanitizeProviderProfile);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !CREDENTIAL_FIELD.test(key.replace(/[_-]/g, '')))
      .map(([key, item]) => [key, sanitizeProviderProfile(item)]),
  );
}

export function publicService(service: any, provider = service.provider): any {
  const data = service.data;
  const publicData =
    provider === 'local'
      ? Object.fromEntries(LOCAL_PUBLIC_FIELDS.filter((key) => Object.prototype.hasOwnProperty.call(data ?? {}, key)).map((key) => [key, data[key]]))
      : sanitizeProviderProfile(data);
  return { id: service.id, userId: service.userId, provider, provider_id: service.provider_id, data: publicData };
}

export function publicServices(services: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(services).map(([provider, service]) => [provider, publicService(service, provider)]));
}
