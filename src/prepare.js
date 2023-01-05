/**
 * @typedef {import('./index').Info} Info
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fse from 'fs-extra';

const SKIP = ['.git', '.gitignore'];

/**
 *
 * In order to run ember-cli commands in a sub-folder,
 * we need to totally remove most of the files (to a tmp location so we can copy them back later)
 *
 * The main thing we do need to keep is the `.git*` directory.
 *
 * @param {Info} info
 * @returns {Promise<{ tmpLocation: string }>}
 */
export async function prepare(info) {
  // remove everything except .git* folders
  let tmp = info.tmpAddonLocation;

  let topLevelPaths = await fs.readdir(info.directory);

  // current is local paths, relative to info.directory
  for (let current of topLevelPaths) {
    if (SKIP.includes(current)) continue;

    let absolutePath = path.join(info.directory, current);

    await fse.move(absolutePath, path.join(tmp, current));
  }

  return { tmpLocation: tmp };
}

export async function createTmp(prefix = 'v2-addon-blueprint--') {
  let prefixPath = path.join(os.tmpdir(), prefix);

  let tmpDirPath = await fs.mkdtemp(prefixPath);

  return tmpDirPath;
}
