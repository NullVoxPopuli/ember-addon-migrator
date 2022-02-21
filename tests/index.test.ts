import { describe, test } from 'vitest';

import { fastVerify, sampleAddons, verify } from './helpers';

describe('basic conversion', () => {
  test('js addon', async () => {
    await verify('base-js-v1-addon');
  });

  test('ts addon', async () => {
    await verify('base-ts-v1-addon');
  });

  test('sample addon [ember-addon-output_4.2.0]', async () => {
    await verify('ember-addon-output_4.2.0');
  });
});

describe('snapshots conversion', () => {
  const addons = sampleAddons();

  addons.forEach((addonName) => {
    test(`sample addon [${addonName}]`, async () => {
      await fastVerify(addonName);
    });
  });
});
