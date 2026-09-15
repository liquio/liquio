/** Resolve only root-relative browser paths against the configured cabinet origin. */
export function resolveReturnPath(
  value: unknown,
  frontRedirectUrl: unknown,
): string | undefined {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20\x7f]/.test(value) ||
    typeof frontRedirectUrl !== "string"
  )
    return undefined;
  try {
    const base = new URL(frontRedirectUrl);
    if (!["https:", "http:"].includes(base.protocol)) return undefined;
    const target = new URL(value, base.origin);
    return target.origin === base.origin ? target.href : undefined;
  } catch {
    return undefined;
  }
}
