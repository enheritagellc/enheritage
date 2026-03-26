/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('./base'),
  plugins: [...(require('./base').plugins || []), 'n'],
  extends: [
    ...(require('./base').extends || []),
    'plugin:n/recommended',
  ],
  rules: {
    ...require('./base').rules,
    'n/no-missing-import': 'off', // TypeScript handles this
    'n/no-unsupported-features/es-syntax': 'off',
  },
  env: {
    ...require('./base').env,
    node: true,
  },
};
