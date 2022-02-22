/**
 * @typedef {import('./index').Info} Info
 * @typedef {import('./index').PackageJson} PackageJson
 */
import fs from 'fs/promises';
import { execa } from 'execa';

/**
 * @param {Info} info
 */
export async function install(info) {
  await execa(info.packager, ['install'], { preferLocal: true, stdio: 'inherit' });
}

/**
 * @param {Info} info
 */
export async function writeRootPackageJson(info) {
  let rootJson = workspacePackageJsonFrom(info);

  // root package.json must not contain 'ember-cli',
  // otherwise ember-cli doesn't work :(
  await fs.writeFile('package.json', JSON.stringify(rootJson, null, 2));
}

/**
 * @param {Info} info
 */
function workspacePackageJsonFrom(info) {
  let { workspace, packageInfo: old, packager } = info;

  /** @type {Partial<PackageJson>} */
  let rootJson = {
    private: true,
    workspaces: [workspace, 'test-app'],
    repository: old.repository,
    license: old.license,
    author: old.author,
    scripts: {},
  };

  if (packager === 'yarn') {
    rootJson.scripts = {
      ...rootJson.scripts,
      build: `yarn workspace ${workspace} build`,
      // Do we want this?
      // prepare: `yarn build`,
    };
  }

  if (old.volta) {
    rootJson.volta = old.volta;
  }

  if (old.engines) {
    rootJson.engines = old.engines;
  }

  return rootJson;
}
