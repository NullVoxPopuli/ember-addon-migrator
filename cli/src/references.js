/**
 * @typedef {import('./analysis/index').AddonInfo} Info
 */
import { packageJson } from 'ember-apply';
import { globby } from 'globby';
import { evaluate, patch } from 'golden-fleece';
import fs from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * @param {Info} info
 */
export async function fixReferences(info) {
  await fixPackageJsonReferences(info);
  await fixTSConfigReferences(info);
}

/**
 * @param {Info} info
 */
export async function fixTSConfigReferences(info) {
  for (const file of await globby(['**/tsconfig*.json'], { gitignore: true })) {
    const filename = join(info.directory, file);
    const dir = dirname(file);
    const contents = await fs.readFile(file, { encoding: 'utf8' });
    const json = evaluate(contents);

    if (json.extends) {
      json.extends = fixPath(info, json.extends, dir);
    }

    if (json.references) {
      json.references = json.references.map((r) => ({
        ...r,
        path: fixPath(info, r.path, dir),
      }));
    }

    if (json.compilerOptions?.paths) {
      json.compilerOptions.paths = Object.fromEntries(
        Object.entries(json.compilerOptions?.paths).map(([key, paths]) => [
          key,
          paths.map((p) => fixPath(info, p, dir)),
        ])
      );
    }

    await fs.writeFile(filename, patch(contents, json));
  }
}

/**
 * @param {Info} info
 */
export async function fixPackageJsonReferences(info) {
  await packageJson.modify((json) => {
    if (json.repository?.directory) {
      json.repository.directory = join(
        json.repository?.directory,
        info.addonLocation
      );
    }

    if (json.volta?.extends) {
      json.volta.extends = fixPath(
        info,
        json.volta.extends,
        info.addonLocation
      );
    }
  }, info.addonLocation);
}

/**
 *
 * @param {Info} info
 * @param {string} path
 * @param {string} dir
 */
function fixPath(info, path, dir) {
  const isContainedInNewAddonFolder = pathIsContainedIn(
    join(dir, path),
    info.addonLocation
  );

  return isContainedInNewAddonFolder
    ? path
    : relative(info.addonLocation, join(info.directory, path));
}

/**
 *
 * @param {string} path
 * @param {string} folder
 * @returns
 */
function pathIsContainedIn(path, folder) {
  return resolve(path).startsWith(resolve(folder));
}
