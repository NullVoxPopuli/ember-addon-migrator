/**
 *
 * @typedef {import('./analysis/index').AddonInfo} Info
 */
import { js } from 'ember-apply';
import fse from 'fs-extra';
import { globby } from 'globby';
import { assert } from 'node:console';
import fs from 'node:fs/promises';
import path from 'node:path';

import { prepare } from './prepare.js';

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
    await fse.move(
      testSupportFolder,
      path.join(info.addonLocation, 'src/test-support'),
      {
        overwrite: true,
      }
    );
  }

  await updateAddonPackageJson(info);
  await updateRollup(info);
}

/**
 * @param {Info} analysis
 * @param {{ globs?: string[] }} [ options ]
 */
export async function moveAddon(analysis, options = {}) {
  let globs = options?.globs ?? [];

  await prepare(analysis);

  await fse.rm(analysis.addonLocation, { force: true, recursive: true });
  await fse.ensureDir(analysis.addonLocation);

  let toMoveTo = path.relative(analysis.directory, analysis.addonLocation);

  let paths = await globby(
    ['*', '!.git', '!.github', `!${toMoveTo}`, ...globs],
    {
      expandDirectories: false,
      cwd: analysis.tmpLocation,
      onlyFiles: false,
      dot: true,
    }
  );

  for (let filePath of paths) {
    let source = path.join(analysis.tmpLocation, filePath);
    let destination = path.join(analysis.addonLocation, filePath);

    await fse.copy(source, destination, { recursive: true });
  }
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

  let { packageJson: old, packageManager } = info;

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

  await fs.writeFile(
    path.join(info.addonLocation, 'package.json'),
    JSON.stringify(pJson, null, 2)
  );
}

/**
 * The default blueprint only specifies components for publicEntrypoints and appReexports.
 * We need to codemod the rollup.config.js / mjs to be have content that matches the files.
 * (at least as a starting point)
 *
 * @param {Info} info
 */
async function updateRollup(info) {
  let configs = await globby([
    path.join(info.addonLocation, 'rollup.config.{js,mjs}'),
  ]);

  assert(
    configs.length === 1,
    'Multiple rollup configs found. Something is wrong with the v2 Addon blueprint'
  );

  // import { Addon } from '@embroider/addov-dev/rollup';
  let importName = '';
  // let addon = new Addon(...);
  let addonInstanceName = '';

  await js.transform(configs[0], async ({ j, root }) => {
    // find "Addon" in import:
    //    import { Addon } from '@embroider/addov-dev/rollup';
    //    (could be imported "as" something else)
    root
      .find(j.ImportDeclaration, {
        source: { value: '@embroider/addon-dev/rollup' },
      })
      .forEach((path) => {
        j(path)
          .find(j.ImportSpecifier, { imported: { name: 'Addon' } })
          .forEach((path) => {
            importName = path.node.local.name;
          });
      });

    // find "addon" in instance creation
    //    (might not be called "addon")
    root
      .find(j.VariableDeclarator, { init: { callee: { name: importName } } })
      .forEach((path) => {
        addonInstanceName = path.node.id.name;
      });

    // find publicEntrypoints, and change the default, per:
    //  https://github.com/embroider-build/embroider/issues/1329
    root
      .find(j.CallExpression, {
        callee: {
          object: { name: addonInstanceName },
          property: { name: 'publicEntrypoints' },
        },
      })
      .forEach((path) => {
        path.node.arguments[0].elements = [
          j.literal('index.js'),
          j.literal('**/*.js'),
        ];
      });

    // Find appReexports and add more stuff, based on what was in the v1 addon's app folder
    root
      .find(j.CallExpression, {
        callee: {
          object: { name: addonInstanceName },
          property: { name: 'appReexports' },
        },
      })
      .forEach((path) => {
        path.node.arguments[0].elements.push(j.literal('modifiers/**/*.js'));
      });
  });
}
