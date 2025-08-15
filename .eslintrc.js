module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'airbnb-base',
    'plugin:vue/vue3-essential',
    'plugin:vue/vue3-strongly-recommended',
    'plugin:vue/vue3-recommended'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module'
  },
  plugins: [
    'vue',
    '@typescript-eslint'
  ],
  rules: {
    // TypeScript 相关规则
    'no-unused-vars': 'off',

    // Vue 相关规则
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-vars': 'error',
    'vue/script-setup-uses-vars': 'error',

    // 通用规则
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'import/no-cycle': 'off',
    'import/named': 'off',
    'import/no-duplicates': 'off',
    'import/order': 'off',
    'import/no-self-import': 'off',
    'import/no-relative-packages': 'off',
    'import/no-useless-path-segments': 'off',
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
    'class-methods-use-this': 'off',
    'no-use-before-define': 'off',
    'max-len': ['error', { code: 120 }],
    semi: ['error', 'never'],
    quotes: ['error', 'single'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-function-paren': ['error', 'never'],
    'keyword-spacing': ['error', { before: true, after: true }],
    'space-infix-ops': 'error',
    'eol-last': ['error', 'always'],
    'no-trailing-spaces': 'error'
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts', '.js', '.jsx', '.json', '.vue']
      }
    }
  }
}
