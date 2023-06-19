export interface TestAppOptions {
  reuseExistingVersions: boolean;
  ignoreNewDependencies: boolean;
}

export interface Options extends TestAppOptions {
  analysisOnly: boolean;
  addonLocation: string;
  testAppLocation: string;
  testAppName: string;
  directory: string;
}
