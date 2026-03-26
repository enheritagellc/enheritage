/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('./base'),
  plugins: [...(require('./base').plugins || []), 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    ...(require('./base').extends || []),
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    ...require('./base').rules,
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
  env: {
    ...require('./base').env,
    browser: true,
  },
};
