import { describe, test } from 'vitest';

import { verify } from './helpers';

describe('basic conversion', () => {
  test('js addon', async () => {
    await verify('base-js-v1-addon');
  });

  test('ts addon', async () => {
    await verify('base-ts-v1-addon');
  });
});
