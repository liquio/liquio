import { installPlugins, InstallDependencies, InstallOptions } from "./install";

function createDeps(
  overrides: Partial<InstallDependencies> = {},
): jest.Mocked<InstallDependencies> {
  return {
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: jest.fn().mockReturnValue("{}"),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    execFileSync: jest.fn(),
    log: jest.fn(),
    ...overrides,
  } as jest.Mocked<InstallDependencies>;
}

const options: InstallOptions = {
  configPath: "/config/plugins.json",
  installDir: "/plugins",
  registry: "https://registry.npmjs.org",
};

describe("installPlugins", () => {
  it("logs and does nothing when plugins.json does not exist", async () => {
    const deps = createDeps({ existsSync: jest.fn().mockReturnValue(false) });

    await installPlugins(options, deps);

    expect(deps.log).toHaveBeenCalledWith(
      `[plugin-installer] No plugins.json at ${options.configPath}, nothing to install.`,
    );
    expect(deps.execFileSync).not.toHaveBeenCalled();
  });

  it("logs and does nothing when there are no enabled plugins (all disabled)", async () => {
    const deps = createDeps({
      readFileSync: jest.fn().mockReturnValue(
        JSON.stringify({
          plugins: [{ package: "foo", version: "1.0.0", isEnabled: false }],
        }),
      ),
    });

    await installPlugins(options, deps);

    expect(deps.log).toHaveBeenCalledWith(
      "[plugin-installer] No enabled plugins in plugins.json, nothing to install.",
    );
    expect(deps.execFileSync).not.toHaveBeenCalled();
  });

  it("logs and does nothing when the plugins array is empty", async () => {
    const deps = createDeps({
      readFileSync: jest.fn().mockReturnValue(JSON.stringify({ plugins: [] })),
    });

    await installPlugins(options, deps);

    expect(deps.log).toHaveBeenCalledWith(
      "[plugin-installer] No enabled plugins in plugins.json, nothing to install.",
    );
    expect(deps.execFileSync).not.toHaveBeenCalled();
  });

  it("installs only the enabled plugin when one is enabled and one is disabled", async () => {
    const deps = createDeps({
      readFileSync: jest.fn().mockReturnValue(
        JSON.stringify({
          plugins: [
            { package: "enabled-pkg", version: "1.2.3", isEnabled: true },
            { package: "disabled-pkg", version: "4.5.6", isEnabled: false },
          ],
        }),
      ),
    });

    await installPlugins(options, deps);

    expect(deps.execFileSync).toHaveBeenCalledTimes(1);
    const [cmd, args] = deps.execFileSync.mock.calls[0];
    expect(cmd).toBe("npm");
    expect(args).toContain("enabled-pkg@1.2.3");
    expect(args).not.toContain("disabled-pkg@4.5.6");
    expect(args.join(" ")).not.toContain("disabled-pkg");
  });

  it("calls mkdirSync and writeFileSync with installDir before execFileSync", async () => {
    const callOrder: string[] = [];
    const deps = createDeps({
      readFileSync: jest.fn().mockReturnValue(
        JSON.stringify({
          plugins: [{ package: "foo", version: "1.0.0", isEnabled: true }],
        }),
      ),
      mkdirSync: jest.fn().mockImplementation(() => {
        callOrder.push("mkdirSync");
      }),
      writeFileSync: jest.fn().mockImplementation(() => {
        callOrder.push("writeFileSync");
      }),
      execFileSync: jest.fn().mockImplementation(() => {
        callOrder.push("execFileSync");
      }),
    });

    await installPlugins(options, deps);

    expect(deps.mkdirSync).toHaveBeenCalledWith(options.installDir);
    expect(deps.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(options.installDir),
      expect.any(String),
    );
    expect(callOrder).toEqual(["mkdirSync", "writeFileSync", "execFileSync"]);
  });

  it("propagates the error when execFileSync throws", async () => {
    const error = new Error("npm install failed");
    const deps = createDeps({
      readFileSync: jest.fn().mockReturnValue(
        JSON.stringify({
          plugins: [{ package: "foo", version: "1.0.0", isEnabled: true }],
        }),
      ),
      execFileSync: jest.fn().mockImplementation(() => {
        throw error;
      }),
    });

    await expect(installPlugins(options, deps)).rejects.toThrow(
      "npm install failed",
    );
  });
});
