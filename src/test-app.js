import path from 'path';
import fs from 'fs/promises';
import fse from 'fs-extra';
import { execa } from 'execa';
import { globby } from 'globby';
import semver from 'semver';
import { packageJson } from 'ember-apply';

/**
 *
 * @param {import('./index').Info} info
 */
export async function migrateTestApp(info) {
  let { packageName, packageInfo } = info;

  let emberCli = 'latest';

  if (packageInfo.devDependencies) {
    let coerced = semver.coerce(packageInfo.devDependencies['ember-cli']);

    if (coerced) {
      emberCli = `${coerced}`;
    }
  }

  await createTestApp(emberCli, packageName);
  await moveTests();

  await moveFilesToTestApp();
  await removeFiles();
}

async function moveFilesToTestApp() {
  // Move useful files to test app
  await fse.move('ember-cli-build.js', 'test-app/ember-cli-build.js', { overwrite: true });
}

/**
 * @param {string} emberCli
 * @param {string} name
 */
async function createTestApp(emberCli, name) {
  let testAppLocation = path.join(process.cwd(), 'test-app');

  await fs.mkdir(testAppLocation, { recursive: true });
  await execa('ember', ['init', '--skip-npm', '--skip-git', '--embroider'], {
    cwd: testAppLocation,
    preferLocal: true,
  });
  await packageJson.addDevDependencies({ [name]: '*' }, testAppLocation);
}

async function moveTests() {
  const paths = await globby(['tests/*']);

  for (let filePath of paths) {
    await fse.move(filePath, `test-app/${filePath}`, { overwrite: true });
  }
}

/**
 * Before this runs, we need to make sure we move all
 * necessary files (as this deletes all top-level js)
 */
async function removeFiles() {
  let unneededPaths = [
    'app',
    '.ember-cli',
    'types',
    'tsconfig.json',
    '.npmignore',
    '.eslintignore',
    'tests/dummy',
    'tests/index.html',
  ];

  let topLevelJs = await globby('*.js');

  await Promise.all([
    ...unneededPaths.map((filePath) => fse.remove(filePath)),
    ...topLevelJs.map((filePath) => fse.remove(filePath)),
  ]);
}
