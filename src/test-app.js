/**
 * @typedef {import('./analysis/index').AddonInfo} Info
 */
import path, { dirname, join } from 'path';
import fs from 'fs/promises';
import { createRequire } from 'module';
import fse from 'fs-extra';
import { execa } from 'execa';
import { globby } from 'globby';
import latestVersion from 'latest-version';
import { packageJson } from 'ember-apply';

import { install } from './workspaces.js';

const require = createRequire(import.meta.url);

/**
 * @param {Info} info
 */
export async function migrateTestApp(info) {
  await moveTests(info);
  // TODO: update in-test imports to use the test-app name instead of "dummy"

  await moveFilesToTestApp(info);
  await updateFilesWithinTestApp(info);
  await removeFiles();
}

/**
 * @param {Info} info
 */
async function moveFilesToTestApp(info) {
  let { testAppLocation } = info;

  // Move useful files to test app
  let toMove = [
    'ember-cli-build.js',
    'config/ember-try.js',
    '.template-lintrc.js',
    '.prettierrc.js',
    '.prettierignore',
    '.eslintrc.js',
  ];

  await Promise.allSettled([
    ...toMove.map((filePath) =>
      fse.move(filePath, `${testAppLocation}/${filePath}`, { overwrite: true })
    ),
  ]);
}

/**
 * @param {Info} info
 */
async function updateFilesWithinTestApp(info) {
  let { testAppLocation } = info;

  // ember-cli-build: EmberAddon => EmberApp
  // ember-cli-build: 'ember-addon' => 'ember-app'
  await replaceIn(`${testAppLocation}/ember-cli-build.js`, 'EmberAddon', 'EmberApp');
  await replaceIn(`${testAppLocation}/ember-cli-build.js`, '/ember-addon', '/ember-app');
  await replaceIn(
    `${testAppLocation}/tests/test-helper.{js,ts}`,
    'dummy/app',
    `${testAppLocation}/app`
  );
  await replaceIn(
    `${testAppLocation}/tests/test-helper.{js,ts}`,
    'dummy/config',
    `${testAppLocation}/config`
  );

  // TODO: pnpm should use the workspace protocol
  await packageJson.removeDevDependencies([info.name], testAppLocation);
  await packageJson.addDependencies({ [info.name]: '*' }, testAppLocation);

  await packageJson.addDevDependencies(
    {
      '@embroider/test-setup': await latestVersion('@embroider/test-setup'),
    },
    testAppLocation
  );

  await packageJson.removeDevDependencies(['ember-welcome-page'], testAppLocation);
  await fse.remove(path.join(testAppLocation, 'app/templates/application.hbs'));

  let current = await packageJson.read(testAppLocation);

  /** @type Record<string, string> */
  let toAdd = {};

  if (info.packageJson.devDependencies && current.devDependencies) {
    let devDeps = info.packageJson.devDependencies;
    let newDevDeps = Object.keys(current.devDependencies);

    for (let [depName, range] of Object.entries(devDeps)) {
      if (newDevDeps.includes(depName)) continue;

      toAdd[depName] = range;
    }
  }

  if (Object.keys(toAdd).length > 0) {
    await packageJson.addDevDependencies(toAdd, testAppLocation);
  }
}

/**
 * @param {string} pkgName
 */
function packagePath(pkgName) {
  return dirname(require.resolve(pkgName + '/package.json'));
}

/**
 * @param {Info} info
 */
async function moveTests(info) {
  let { testAppLocation } = info;

  await fse.remove('tests/dummy');
  await fse.remove('tests/index.html');

  const paths = await globby([path.join(info.tmpLocation, 'tests/**/*')]);

  for (let filePath of paths) {
    let localFile = filePath.replace(info.tmpLocation, '');

    await fse.move(filePath, path.join(info.testAppLocation, localFile), { overwrite: true });
  }
}

/**
 * Before this runs, we need to make sure we move all
 * necessary files (as this deletes all top-level js)
 */
async function removeFiles() {
  let unneededPaths = [
    'app',
    'vendor',
    'tests',
    'config',
    '.watchmanconfig',
    '.ember-cli',
    'types',
    'tsconfig.json',
    '.npmignore',
    '.eslintignore',
    'tests/dummy',
    'tests/index.html',
  ];

  let topLevelJs = await globby('*.js');

  await Promise.allSettled([
    ...unneededPaths.map((filePath) => fse.remove(filePath)),
    ...topLevelJs.map((filePath) => fse.remove(filePath)),
  ]);
}

/**
 * @param {string} glob
 * @param {string} toFind
 * @param {string} replaceWith
 */
async function replaceIn(glob, toFind, replaceWith) {
  let filePaths = await globby(glob);

  for (let filePath of filePaths) {
    let buffer = await fs.readFile(filePath);
    let asString = buffer.toString();
    let replaced = asString.replaceAll(toFind, replaceWith);

    await fs.writeFile(filePath, replaced);
  }
}
