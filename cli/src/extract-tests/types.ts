// eslint-disable-next-line n/no-missing-import
import type { TestAppOptions } from '../types';

export interface Args extends TestAppOptions {
  testAppLocation: string;
  directory: string;
  inPlace?: boolean;
  addonLocation: string;
  testAppName: string;
  analysisOnly: boolean;
}
