import { js } from 'ember-apply';
import { globbyStream } from 'globby';
import path from 'node:path';

const globs = [
  '**/*.{js,ts}',
  // Addons that have fancy build time stuff can't be converted to v2 automatically
  '!^index.js',
  // Don't need to traverse these
  '!**/docs/**/*',
  '!**/node_modules/**/*',
  // Generated Directories
  '!**/dist/**/*',
  '!**/declarations/**/*',
  // These don't usually have imports we'd care about
  '!**/blueprints/**/*',
  '!**/config/**/*',
  '!**/public/**/*',
  '!**/vendor/**/*',
];

// These are provided by ember-source
const EMBER_VIRTUAL_DEPENDENCIES = [
  '@ember/application',
  '@ember/array',
  '@ember/component',
  '@ember/controller',
  '@ember/debug',
  '@ember/destroyable',
  '@ember/helper',
  '@ember/owner',
  '@ember/object',
  '@ember/routing',
  '@ember/runloop',
  '@ember/service',
  '@ember/template',
  '@ember/string',
  '@ember/error',
  '@ember/utils',
  '@ember/test',
  'ember',
  'rsvp',

  // People should *not* be importing from these packages... :-\
  // DANGER!
  '@glimmer/validator',
];

/**
 * @param {string} directory
 *
 * @returns {Promise<{
 *   addon: Set<string>;
 *   testSupport: Set<string>;
 *   tests: Set<string>;
 * }>}
 */
export async function analyzeImports(directory) {
  let addon = new Set();
  let testSupport = new Set();
  let tests = new Set();

  await runOnGlob(
    directory,
    async (filePath) => {
      let deps = await collectImportedDependencies(filePath);

      let relevantSet;

      if (filePath.includes(`${directory}/addon`)) {
        relevantSet = addon;
      } else if (filePath.includes(`${directory}/test-support`)) {
        relevantSet = testSupport;
      } else if (filePath.includes(`${directory}/tests`)) {
        relevantSet = tests;
      }

      if (!relevantSet) return;

      for (let depName of deps) {
        relevantSet.add(depName);
      }
    },
    globs
  );

  return {
    addon,
    testSupport,
    tests,
  };
}

/**
 * @param {string} filePath
 * @returns {Promise<string[]>}
 */
async function collectImportedDependencies(filePath) {
  /** @type {string[]} */
  let importedDeps = [];

  await js.analyze(filePath, async ({ root, j }) => {
    root.find(j.ImportDeclaration).forEach((path) => {
      let importPath = path.node.source.value;

      if (importPath.startsWith('.')) return;

      let pkgName = importPathToPackage(importPath);

      // BUNDLED from other locations
      if (EMBER_VIRTUAL_DEPENDENCIES.includes(pkgName)) {
        importedDeps.push('ember-source');

        return;
      }

      importedDeps.push(pkgName);
    });
  });

  return importedDeps;
}

/**
 * TODO: move this to ember-apply?
 *
 * @param {string} directory
 * @param {<Return>(filePath: string) => Return | void | Promise<Return | void>} fn
 * @param {string[]} glob
 */
async function runOnGlob(directory, fn, glob) {
  let globs = glob.map((g) => {
    if (g.startsWith('!')) {
      return g;
    }

    return path.join(directory, g);
  });

  for await (let filePath of globbyStream(globs)) {
    try {
      await fn(filePath.toString());
    } catch (e) {
      console.error(
        `Problem occurred (likely parsing error) while trying to run fn on: `,
        filePath
      );
      // throw e;
    }
  }
}

/**
 * @param {string} specifier
 */
function importPathToPackage(specifier) {
  let parts = specifier.split('/');

  let [first, second] = parts;

  if (first.startsWith('@')) {
    return [first, second].join('/');
  }

  return first;
}
