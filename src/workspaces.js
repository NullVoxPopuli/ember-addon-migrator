/**
 * @typedef {import('./analysis/index').AddonInfo} Info
 * @typedef {import('./analysis/types').PackageJson} PackageJson
 */
import { execa } from 'execa';
import fse from 'fs-extra';
import deepMerge from 'merge';
import fs from 'node:fs/promises';
import path from 'path';

/**
 * @param {Info} info
 * @param {{ hidden?: boolean }} [options]
 */
export async function install(info, options = {}) {
  /** @type {any} */
  let opts = {};

  if (options.hidden) {
    opts.stdout = 'ignore';
  } else {
    opts.stdio = 'inherit';
  }

  try {
    await execa(info.packageManager, ['install'], opts);
  } catch (e) {
    if (!(e instanceof Error)) throw e;

    console.warn(e.message);
  }
}

/**
 * @param {Info} info
 */
export async function updateRootFiles(info) {
  /**
   * If we're in a bigger monorepo, we need to remove the
   * known monorepeo root files, because they likely exist elsewhere.
   */
  if (info.isBiggerMonorepo) {
    await fse.rm(path.join(info.directory, 'package.json'));

    if (info.isPnpm) {
      await fse.rm(path.join(info.directory, 'pnpm-workspace.yaml'));
    }

    return;
  }

  await updatePackageJson(info);
}

/**
 * @param {Info} info
 */
async function updatePackageJson(info) {
  let packageJsonPath = path.join(info.directory, 'package.json');
  let generated = await fse.readJSON(packageJsonPath);

  let newInfo = workspacePackageJsonFrom(info);

  let nextPackageJson = deepMerge(generated, newInfo);

  await fs.writeFile(packageJsonPath, JSON.stringify(nextPackageJson, null, 2));
}

/**
 * @param {Info} info
 */
function workspacePackageJsonFrom(info) {
  let { packageJson: old } = info;

  /** @type {Partial<PackageJson>} */
  let rootJson = {
    private: true,
    repository: old.repository,
    license: old.license,
    author: old.author,
  };

  if (old.volta) {
    rootJson.volta = old.volta;
  }

  if (old.engines) {
    rootJson.engines = old.engines;
  }

  return rootJson;
}
