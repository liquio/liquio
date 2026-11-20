export type CapturedLog = { type: string; data: Record<string, any>; level: string };

/**
 * Captures JSON log lines written by ConsoleLogger to console.log/warn/error.
 */
export function captureLogs() {
  const lines: CapturedLog[] = [];
  const collect = (message: unknown) => {
    try {
      lines.push(JSON.parse(String(message)));
    } catch {
      // not a log line
    }
  };

  const spies = (['log', 'warn', 'error'] as const).map((method) => jest.spyOn(console, method).mockImplementation(collect));

  return {
    lines,
    byType: (type: string) => lines.filter((line) => line.type === type),
    raw: () => JSON.stringify(lines),
    restore: () => spies.forEach((spy) => spy.mockRestore()),
  };
}
