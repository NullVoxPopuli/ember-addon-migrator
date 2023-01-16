/**
 *
 * @typedef {import('./analysis/index').AddonInfo} Info
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import fse from 'fs-extra';
import latestVersion from 'latest-version';

/**
 * @param {Info} info
 */
export async function migrateAddon(info) {
  let addonFolder = path.join(info.tmpLocation, 'addon');
  let testSupportFolder = path.join(info.tmpLocation, 'addon-test-support');

  if (await fse.pathExists(addonFolder)) {
    await fse.move(addonFolder, path.join(info.addonLocation, 'src'), {
      overwrite: true,
    });
  }

  if (await fse.pathExists(testSupportFolder)) {
    await fse.move(testSupportFolder, path.join(info.addonLocation, 'src/test-support'), {
      overwrite: true,
    });
  }

  await updateAddonPackageJson(info);
}

/*
 * Common dependencies in v1 addons that we don't need in v2 addons
 * */
const NO_LONGER_NEEDED = [
  'ember-auto-import',
  'ember-cli-babel',
  'ember-cli-htmlbars',
  'ember-cli-typescript',
  // Fake modules, listing them did nothing
  '@glimmer/tracking',
  '@glimmer/component',
];

/**
 * @param {Info} info
 */
async function updateAddonPackageJson(info) {
  /** @type {Partial<import('./analysis/types').PackageJson>} */
  let pJson = await fse.readJSON(path.join(info.addonLocation, 'package.json'));

  let { isTS, packageJson: old, packageManager } = info;

  pJson.version = old.version;
  pJson.license = old.license;
  pJson.description = old.description;
  pJson.repository = old.repository;
  pJson.author = old.author;

  if (pJson.scripts) {
    if (!info.isBiggerMonorepo) {
      pJson.scripts.prepare = `${packageManager} run build`;
    }

    pJson.scripts.prepack = `${packageManager} run build`;
  }

  if (old.publishConfig) {
    pJson.publishConfig = old.publishConfig;
  }

  if (old.volta) {
    pJson.volta = {
      extends: path.join(
        path.relative(info.addonLocation, info.packageManagerRoot),
        'package.json'
      ),
    };
  }

  if (old.release) {
    pJson.release = old.release;
  }

  if (old.peerDependencies) {
    pJson.peerDependencies = old.peerDependencies;
  }

  if (old.dependencies && pJson.dependencies) {
    for (let [depName, range] of Object.entries(old.dependencies)) {
      if (NO_LONGER_NEEDED.includes(depName)) continue;

      pJson.dependencies[depName] = range;
    }
  }

  await fs.writeFile(`${info.addonLocation}/package.json`, JSON.stringify(pJson, null, 2));
}

/**
 * @param {string[]} packageList
 */
async function withVersions(packageList) {
  /** @type {Record<string, string>} */
  let mapped = {};

  const versions = await Promise.all(
    packageList.map((name) => {
      return latestVersion(name);
    })
  );

  // keep ordering consistent between migration
  packageList.forEach((name, index) => {
    mapped[name] = versions[index];
  });

  return mapped;
}
