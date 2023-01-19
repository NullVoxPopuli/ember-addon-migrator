'use strict';

const { configs } = require('@nullvoxpopuli/eslint-configs');

const config = configs.node();

module.exports = {
  ...config,
  overrides: [
    ...config.overrides,
    {
      files: ['**/*.{ts,js,mts,mjs}'],
      rules: {
        // https://github.com/eslint-community/eslint-plugin-n/issues/75
        'n/no-missing-import': 'off',
      },
    },
  ],
};
