import { describe, test } from 'vitest';

import { fastVerify, sampleAddons } from './helpers';

describe('snapshots conversion', () => {
  const addons = sampleAddons();

  addons.forEach((addonName) => {
    test(`sample addon [${addonName}]`, async () => {
      await fastVerify(addonName);
    });
  });
});
