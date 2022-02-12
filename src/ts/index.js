/**
 *
 * @typedef {import('../index').Info} Info
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { files } from 'ember-apply';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {Info} info
 */
export async function setupTs(info) {
  let { workspace } = info;

  let tsFiles = path.join(__dirname, 'files');

  await files.applyFolder(tsFiles, workspace);

  // TODO: scan src/**/*.ts for @ember types
}
