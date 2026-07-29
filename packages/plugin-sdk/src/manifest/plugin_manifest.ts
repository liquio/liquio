export type PluginKind = "event-external-service" | "external-reader-provider";

export interface PluginManifest {
  name: string;
  kind: PluginKind;
  sdkVersion: string;
  main?: string;
}

const VALID_KINDS: PluginKind[] = [
  "event-external-service",
  "external-reader-provider",
];

export function readPluginManifest(
  packageJson: Record<string, unknown>,
): PluginManifest {
  const name = packageJson.name;
  const liquioPlugin = packageJson.liquioPlugin as
    Record<string, unknown> | undefined;

  if (typeof name !== "string") {
    throw new Error('Invalid plugin package.json: missing "name"');
  }
  if (!liquioPlugin || typeof liquioPlugin !== "object") {
    throw new Error(
      `Invalid plugin package.json for "${name}": missing "liquioPlugin" block`,
    );
  }
  const kind = liquioPlugin.kind;
  const sdkVersion = liquioPlugin.sdkVersion;
  if (typeof kind !== "string" || !VALID_KINDS.includes(kind as PluginKind)) {
    throw new Error(
      `Invalid plugin package.json for "${name}": liquioPlugin.kind must be one of ${VALID_KINDS.join(", ")}`,
    );
  }
  if (typeof sdkVersion !== "string") {
    throw new Error(
      `Invalid plugin package.json for "${name}": liquioPlugin.sdkVersion must be a string`,
    );
  }
  const main =
    typeof packageJson.main === "string" ? packageJson.main : undefined;

  return { name, kind: kind as PluginKind, sdkVersion, main };
}

export function assertManifestCompatible(
  manifest: PluginManifest,
  currentSdkVersion: string,
): void {
  // Minimal check for v1: exact major-version match (no semver-range library dependency).
  const manifestMajor = manifest.sdkVersion.replace(/^\D*/, "").split(".")[0];
  const currentMajor = currentSdkVersion.split(".")[0];
  if (manifestMajor !== currentMajor) {
    throw new Error(
      `Plugin "${manifest.name}" requires @liquio/plugin-sdk ${manifest.sdkVersion}, host runs ${currentSdkVersion}`,
    );
  }
}
