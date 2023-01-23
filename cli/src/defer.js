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
