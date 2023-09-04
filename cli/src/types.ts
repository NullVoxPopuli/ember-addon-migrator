export interface TestAppOptions {
  reuseExistingVersions: boolean;
  ignoreNewDependencies: boolean;
  reuseExistingConfigs: boolean;
  skipEmberTry: boolean;
}

export interface Options extends TestAppOptions {
  analysisOnly: boolean;
  addonLocation: string;
  testAppLocation: string;
  testAppName: string;
  directory: string;
  excludeTests: boolean;
}
