import { describe, test } from 'vitest';

import { verify, findFixtures } from './helpers.js';

let fixtures = await findFixtures();

describe('fixtures', () => {
  for (let fixtureName of fixtures) {
    test(fixtureName, async () => {
      await verify(fixtureName);
    });
  }
})

