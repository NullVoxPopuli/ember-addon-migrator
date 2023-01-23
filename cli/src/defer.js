/**
 *
 * @typedef {import('./analysis/index').AddonInfo} Info
 */
import { execa } from 'execa';

/**
 * @param {Info} info
 */
export async function deferCodemod(info) {
  return execa('npx', ['ember-codemod-v1-to-v2', `--root=${info.directory}`], {
    stdio: 'inherit',
  });
}

/**
 * @param {Info} info
 */
export async function addMissingFiles(info) {
  /**
    * 1. .template-lintrc.js
    */

}

/**
 * @param {Info} info
 */
export async function addMissingDependencies(info) {
  let addDev = async (depName, where) => {
    let { packageManager } = info;
    let add;

    switch ( packageManager ) {
      case 'pnpm': { add = ['add', '--save-dev']; break; }
      case 'yarn': { add = ['add', '--dev']; break; }
      case 'npm': { add = ['install', '--save-dev']; break; }
    }

    await execa(packageManager, [...add, depName], { cwd: where }) ;
  }

  await addDev('npm-run-all', info.addonLocation);
  await addDev('ember-template-lint', info.addonLocation);
  await addDev('npm-run-all', info.testAppLocation);
}
