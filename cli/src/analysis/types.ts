import type { PackageJson as BasicPackage } from "types-package-json";

export interface Options {
  analysisOnly: boolean;
  addonLocation: string;
  testAppLocation: string;
  testAppName: string;
  directory: string;
}

interface Volta {
  node?: string;
  yarn?: string;
  npm?: string;
  extends?: string;
}

type EmberAddon =
  | { configPath: string }
  | {
      version: number;
      type: string;
      main: string;
      "app-js": Record<string, string>;
    };

interface Ember {
  edition?: "octane";
}

/**
 * Maybe a different package.json type exists somewhere?
 */
interface PackageExtras {
  volta?: Volta;
  ember?: Ember;
  "ember-addon"?: EmberAddon;
  private?: boolean;
  /**
   * Present in npm and yarn, but not pnpm
   */
  workspaces?: string[];
  types?: string;
  release?: unknown;
  msw?: unknown;
  publishConfig?: Record<string, string>;
  exports?: Record<string, any>;
}

export type PackageJson = PackageExtras & BasicPackage;

export interface ImportedDependencies {
  addon: Set<string>;
  testSupport: Set<string>;
  tests: Set<string>;
}
