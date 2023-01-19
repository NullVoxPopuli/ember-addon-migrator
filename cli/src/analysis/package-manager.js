import fse from "fs-extra";
import path from "node:path";

import { AnalysisError } from "./error.js";

/**
 * @param {string} root
 * @param {import('./types').Options} options

 * @returns {Promise<{ manager: 'yarn' | 'npm' | 'pnpm', root: string }>}
 */
export async function guessPackageManager(root, options) {
  let isYarn = false;
  let isNpm = false;
  let isPnpm = false;
  let dir = options.directory;
  let paths = [];
  let packagerRoot = root;

  while (dir !== path.dirname(root)) {
    paths.push(dir);
    isYarn = fse.existsSync(path.join(dir, "yarn.lock"));
    isNpm = fse.existsSync(path.join(dir, "package-lock.json"));
    isPnpm = fse.existsSync(path.join(dir, "pnpm-lock.yaml"));

    if (isYarn || isNpm || isPnpm) {
      packagerRoot = dir;

      break;
    }

    dir = path.resolve(path.join(dir, ".."));
  }

  if (!isYarn && !isNpm && !isPnpm) {
    throw new AnalysisError(
      `Could not determine packager. Searched in: ${paths.join(", ")}`
    );
  }

  const packager = (isYarn && "yarn") || (isNpm && "npm") || "pnpm";

  return { manager: packager, root: packagerRoot };
}
