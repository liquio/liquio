import { resolveReturnPath } from "./return_path";

describe("resolveReturnPath", () => {
  const base = "https://cabinet.example/tasks/{taskId}";
  it("preserves the originating step, query and hash on the configured origin", () => {
    expect(
      resolveReturnPath("/tasks/task-1/personalInfo?lang=de#payment", base),
    ).toBe("https://cabinet.example/tasks/task-1/personalInfo?lang=de#payment");
  });
  it.each([
    undefined,
    null,
    1,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\nevil.example",
    "javascript:alert(1)",
  ])("rejects unsafe or invalid destinations: %s", (path) => {
    expect(resolveReturnPath(path, base)).toBeUndefined();
  });
  it("requires a configured HTTP cabinet origin", () => {
    expect(resolveReturnPath("/tasks/1", undefined)).toBeUndefined();
    expect(
      resolveReturnPath("/tasks/1", "javascript:alert(1)"),
    ).toBeUndefined();
  });
});
