module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Security-focused rules (manual configuration for better control)
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-proto': 'error',
    'no-iterator': 'error',
    'no-with': 'error',

    // Prevent common vulnerabilities
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    'no-debugger': 'error',
    'no-alert': 'error',

    // Variable declarations - strict
    'no-undef': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-use-before-define': ['error', { functions: false }],
    'prefer-const': 'error',
    'no-var': 'error',

    // Functions - security and quality
    'no-param-reassign': 'warn',
    'consistent-return': 'error',
    'no-return-assign': 'error',
    'no-return-await': 'error',

    // Async/await best practices
    'require-await': 'error',
    'no-async-promise-executor': 'error',
    'no-await-in-loop': 'warn',
    'prefer-promise-reject-errors': 'error',

    // Error handling - security critical
    'handle-callback-err': 'error',
    'no-throw-literal': 'error',

    // Best practices - prevent bugs and security issues
    'eqeqeq': ['error', 'always'],
    'no-eq-null': 'error',
    'curly': ['error', 'all'],
    'dot-notation': 'error',
    'guard-for-in': 'error',
    'no-caller': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-fallthrough': 'error',
    'no-floating-decimal': 'error',
    'no-implicit-coercion': 'error',
    'no-implicit-globals': 'error',
    'no-lone-blocks': 'error',
    'no-loop-func': 'error',
    'no-multi-spaces': 'error',
    'no-new': 'error',
    'no-new-wrappers': 'error',
    'no-octal-escape': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'radix': 'error',
    'wrap-iife': 'error',
    'yoda': 'error',

    // Code style - minimal but important
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'max-len': ['warn', {
      code: 120,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true
    }],

    // Import/Export
    'no-duplicate-imports': 'error',

    // Node.js specific security
    'no-process-exit': 'warn',
    'no-sync': 'warn'
  },
  overrides: [
    {
      // Test files can be more lenient
      files: ['**/tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-console': 'off',
        'max-len': 'off',
        'no-sync': 'off'
      }
    }
  ]
};