import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Returns the absolute path of a given directory
 * This can only resolve directories that exist.
 *
 * @param {string} directory;
 */
export function resolvedDirectory(directory) {
  /** @type {string} */
  let absolute;

  if (directory.startsWith('/')) {
    absolute = directory;
  } else {
    absolute = path.resolve(path.join(process.cwd(), directory));
  }

  return absolute;
}

export async function createTmp(prefix = '_ember-v1-to-v2-addon-migrator_') {
  let prefixPath = path.join(os.tmpdir(), prefix);

  let tmpDirPath = await fs.mkdtemp(prefixPath);

  return tmpDirPath;
}
