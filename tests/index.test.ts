import { describe, test } from 'vitest';

import { verify } from './helpers.js';

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
