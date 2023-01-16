import { module, test } from 'qunit';

import { two } from 'base-ts-v1-addon';

module('Unit | the test', function () {
  test('it works', function (assert) {
    assert.strictEqual(two, 'two');
  });
});
