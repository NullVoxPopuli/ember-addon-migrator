/**
 * @typedef {import('./index').Info} Info
 */
import path from 'path';
import fs from 'fs/promises';
import fse from 'fs-extra';
import { execa } from 'execa';
import { globby } from 'globby';
import { packageJson } from 'ember-apply';

/**
 * @param {Info} info
 */
export async function migrateTestApp(info) {
  await createTestApp(info);
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
  let { testWorkspace } = info;

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
      fse.move(filePath, `${testWorkspace}/${filePath}`, { overwrite: true })
    ),
  ]);
}

/**
 * @param {Info} info
 */
async function updateFilesWithinTestApp(info) {
  let { testWorkspace } = info;

  // ember-cli-build: EmberAddon => EmberApp
  // ember-cli-build: 'ember-addon' => 'ember-app'
  await replaceIn(`${testWorkspace}/ember-cli-build.js`, 'EmberAddon', 'EmberApp');
  await replaceIn(`${testWorkspace}/ember-cli-build.js`, '/ember-addon', '/ember-app');
}

/**
 * @param {Info} info
 */
async function createTestApp(info) {
  let { packageName, testWorkspace } = info;
  let testAppLocation = path.join(process.cwd(), testWorkspace);

  await fs.mkdir(testAppLocation, { recursive: true });
  await execa('ember', ['init', '--skip-npm', '--skip-git', '--embroider'], {
    cwd: testAppLocation,
    preferLocal: true,
  });
  await packageJson.addDevDependencies({ [packageName]: '*' }, testAppLocation);
}

/**
 * @param {Info} info
 */
async function moveTests(info) {
  let { testWorkspace, isTs } = info;

  await fse.remove('tests/dummy');

  const paths = await globby(['tests/**/*']);

  for (let filePath of paths) {
    await fse.move(filePath, `${testWorkspace}/${filePath}`, { overwrite: true });
  }

  if (isTs) {
    let jsSetup = `${testWorkspace}/tests/test-helper.js`;
    let tsSetup = `${testWorkspace}/tests/test-helper.ts`;

    if ((await fse.pathExists(jsSetup)) && (await fse.pathExists(tsSetup))) {
      fse.remove(jsSetup);
    }
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
 * @param {string} filePath
 * @param {string} toFind
 * @param {string} replaceWith
 */
async function replaceIn(filePath, toFind, replaceWith) {
  let buffer = await fs.readFile(filePath);
  let asString = buffer.toString();
  let replaced = asString.replaceAll(toFind, replaceWith);

  await fs.writeFile(filePath, replaced);
}
