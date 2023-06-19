/**
 * Type imports!
 *
 * @typedef {import('./types').Options} RunOptions
 * @typedef {import('./types').PackageJson} PackageJson
 */

import { packageJson, project } from 'ember-apply';
import util from 'node:util';

import { NothingToDoError, tryOrFail } from './error.js';
import { analyzeImports } from './imports.js';
import { createTmp } from './paths.js';

/**
 * @param {RunOptions} args
 */
export async function analyze(args) {
  let analysis = await AddonInfo.create(args);

  if (args.analysisOnly) {
    console.debug(util.inspect(analysis, { showHidden: true, getters: true }));

    // eslint-disable-next-line n/no-process-exit
    process.exit(0);
  }

  if (!analysis.isV1Addon) {
    throw new Error(`This operations is only allowed on v1 addons`);
  }

  return analysis;
}

/**
 * Goal:
 * This class should be robust, and not error when analyzing an addon.
 * All data defined must be known, and resilient to weirdness, or print a specific error about
 * how to get around a problem.
 */
export class AddonInfo {
  /**
   * This method abstracts all the async stuff that goes in to analyzing an addon.
   *
   *
   * @param {RunOptions} options
   */
  static async create(options) {
    /** @type {any} */
    let pkgJson = await tryOrFail(
      () => packageJson.read(),
      `Could not read the package.json. ` +
        `Please either run ember-addon-migrator from a package directory, or specify a path to a package directory via --directory`
    );

    let repoRoot = await tryOrFail(
      () => project.gitRoot(),
      `Could not find git root. Only git is supported at this time.`
    );

    let packageManager = await project.getPackageManager(repoRoot);
    let packageManagerRoot;

    try {
      packageManagerRoot = await project.workspaceRoot(repoRoot);
    } catch {
      // ignore everything
    }

    /** @type {string[]} */
    let existingWorkspaces = [];

    try {
      existingWorkspaces = await project.getWorkspaces(repoRoot);
    } catch {
      // ignore everything
    }

    // At this point, the CWD *is* the addon.
    // Verified by the above not erroring.
    let importedDependencies = await analyzeImports(process.cwd());

    let tmpDirectory = await createTmp();

    let info = new AddonInfo({
      packageJson: pkgJson,
      options,
      packageManager,
      packageManagerRoot,
      repoRoot,
      tmpDirectory,
      importedDependencies,
      existingWorkspaces,
    });

    if (info.isV2Addon) {
      throw new NothingToDoError(
        `${info.name} is already a V2 addon. Migration will stop.`
      );
    }

    return info;
  }

  /** @type {RunOptions} */
  #options;
  /** @type {PackageJson} */
  packageJson;
  /** @type {string} */
  #tmpDirectory;
  /** @type {string} */
  gitRoot;
  /**
   * Directory where the package-manager's lockfile is.
   * @type {string}
   * */
  packageManagerRoot;
  /** @type {'npm' | 'yarn' | 'pnpm'} */
  packageManager;

  /** @type {import('./types').ImportedDependencies} */
  importedDependencies;

  /** @type {string[]} */
  #existingWorkspaces;

  /**
   * @typedef {object}  ResolvedInfo
   * @property {PackageJson} packageJson
   * @property {RunOptions} options
   * @property {'npm' | 'yarn' | 'pnpm'} packageManager
   * @property {string} packageManagerRoot
   * @property {string} repoRoot
   * @property {string} tmpDirectory
   * @property {import('./types').ImportedDependencies} importedDependencies
   * @property {string[]} existingWorkspaces
   *
   * @param {ResolvedInfo} resolvedInfo;
   */
  constructor(resolvedInfo) {
    this.packageJson = resolvedInfo.packageJson;
    this.#options = resolvedInfo.options;
    this.packageManager = resolvedInfo.packageManager;
    this.packageManagerRoot = resolvedInfo.packageManagerRoot;
    this.gitRoot = resolvedInfo.repoRoot;
    this.#tmpDirectory = resolvedInfo.tmpDirectory;
    this.importedDependencies = resolvedInfo.importedDependencies;
    this.#existingWorkspaces = resolvedInfo.existingWorkspaces;
  }

  /**
   * V1 Addons are loose about their dependencies,
   * so we collect both dependencies and devDependencies
   */
  get #localDependencies() {
    return {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };
  }

  get #localDependencyNames() {
    return new Set(Object.keys(this.#localDependencies));
  }

  get name() {
    return this.packageJson.name;
  }

  get isTS() {
    return this.#localDependencyNames.has('typescript');
  }

  get isYarn() {
    return this.packageManager === 'yarn';
  }

  get isNpm() {
    return this.packageManager === 'npm';
  }

  get isPnpm() {
    return this.packageManager === 'pnpm';
  }

  get isEmber() {
    return Boolean(
      this.packageJson['ember-addon'] || this.packageJson['ember']
    );
  }

  get isAddon() {
    return (
      this.isEmber &&
      Boolean(this.packageJson.keywords?.includes('ember-addon'))
    );
  }

  get isV1Addon() {
    return this.isAddon && !this.isV2Addon;
  }

  get isV2Addon() {
    if (!this.isAddon) return false;

    let emberAddon = this.packageJson['ember-addon'];

    if (emberAddon && 'version' in emberAddon) {
      return emberAddon.version === 2;
    }

    return false;
  }

  /**
   * if true, this tool will not create a top-level / workspaces package.json
   */
  get isBiggerMonorepo() {
    return this.#existingWorkspaces.length > 1;
  }

  /****************************************************************************
   *
   * Data used during the transformation to v2
   * may be incomplete, or need further resolving (such as relative => absolute)
   *
   * *************************************************************************/

  /**
   * Directory to run the migration in.
   * Will error if the detected project is not a V1 Addon
   *
   * Defaults to CWD / PWD
   */
  get directory() {
    return this.#options.directory || process.cwd();
  }

  /**
   * The tmp directory where the original addon files are moved while the new addon is generated
   */
  get tmpLocation() {
    return this.#tmpDirectory;
  }

  /**
   * The relative path the addon will end up in.
   * In solo-monorepos, defaults to <directory>/<addon-name>
   * In big monorepos, defaults to <directory>/package
   *   (because <directory> usually ends with some form of the addon-name)
   */
  get addonLocation() {
    if (this.isBiggerMonorepo) {
      return this.#options.addonLocation || 'package';
    }

    return (
      this.#options.addonLocation || (this.name.split('/')[1] ?? this.name)
    );
  }

  /**
   * The path the test-app will end up in - defaults to <directory>/test-app
   */
  get testAppLocation() {
    return this.#options.testAppLocation || 'test-app';
  }

  /**
   * The name of the test-app.
   * In a single-addon-monorepo, this can remain the default, "test-app", but in a bigger monorepo,
   * this will default to "test-app-for-{safe-addon-name}"
   *
   * For example, if an addon is `@limber/ui`, the test-app name will be:
   * "test-app-for-limber__ui"
   */
  get testAppName() {
    if (this.isBiggerMonorepo) {
      return (
        this.#options.testAppName || `test-app-for-${pathifyNpmName(this.name)}`
      );
    }

    return this.#options.testAppName || 'test-app';
  }

  /**
   * checks the old package.json
   * @param {string} dep
   */
  hasDependency = (dep) => {
    return Boolean(this.packageJson.dependencies?.[dep]);
  };

  /**
   * checks the old package.json
   * @param {string} dep
   */
  hasDevDependency = (dep) => {
    return Boolean(this.packageJson.devDependencies?.[dep]);
  };

  /**
   * get the version specifier of an existing dependency
   * @param {string} dep
   */
  versionForDependency = (dep) => {
    return (
      this.packageJson.dependencies?.[dep] ??
      this.packageJson.devDependencies?.[dep]
    );
  };
}

/**
 * @param {string} name
 */
function pathifyNpmName(name) {
  return name.replace('@', '').replace('/', '__');
}
