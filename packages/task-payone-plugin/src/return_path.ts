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

/** Restore the payment step when a checkout return destination only identifies the task. */
export function resolvePaymentStep(
  redirectUrl: string | undefined,
  taskId: string | undefined,
  paymentControlPath: string,
): string | undefined {
  const step = paymentControlPath.split(".properties.")[0];
  if (!redirectUrl || !taskId || step === paymentControlPath)
    return redirectUrl;
  try {
    const target = new URL(redirectUrl);
    // Only extend the standard task-root destination; preserve custom routes and explicit steps.
    if (
      ["http:", "https:"].includes(target.protocol) &&
      target.pathname.replace(/\/$/, "").endsWith(`/tasks/${taskId}`)
    ) {
      target.pathname = `${target.pathname.replace(/\/$/, "")}/${encodeURIComponent(step)}`;
      return target.href;
    }
  } catch {
    // Preserve existing handling of non-URL redirect templates.
  }
  return redirectUrl;
}
