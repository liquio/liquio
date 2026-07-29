#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { installPlugins } from "./install";

const configDir = process.env.CONFIG_PATH || "/var/www/config";

installPlugins(
  {
    configPath: path.join(configDir, "plugins.json"),
    installDir: process.env.PLUGINS_INSTALL_DIR || "/var/www/plugins",
    registry: process.env.NPM_REGISTRY || "https://registry.npmjs.org",
  },
  {
    existsSync: fs.existsSync,
    readFileSync: (p) => fs.readFileSync(p, "utf8"),
    mkdirSync: (p) => fs.mkdirSync(p, { recursive: true }),
    writeFileSync: fs.writeFileSync,
    execFileSync,
    log: console.log,
  },
).catch((err) => {
  console.error(err);
  process.exit(1);
});
