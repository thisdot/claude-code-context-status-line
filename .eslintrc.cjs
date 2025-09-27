module.exports = {
  env: {
    node: true,
    es2022: true
  },
  extends: [
    'eslint:recommended'
  ],
  plugins: [
    'security'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // === SECURITY CRITICAL ===
    // Dangerous code prevention
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-proto': 'error',
    'no-iterator': 'error',
    'no-with': 'error',
    'no-global-assign': 'error',
    'no-obj-calls': 'error',
    'no-unsafe-negation': 'error',
    'no-unsafe-optional-chaining': 'error',
    'no-loss-of-precision': 'error',
    'no-unreachable': 'error',
    'no-constant-condition': 'error',

    // Security plugin rules (commented out until plugin compatibility resolved)
    // 'security/detect-buffer-noassert': 'error',
    // 'security/detect-child-process': 'warn',
    // 'security/detect-disable-mustache-escape': 'error',
    // 'security/detect-eval-with-expression': 'error',
    // 'security/detect-new-buffer': 'error',
    // 'security/detect-non-literal-regexp': 'warn',
    // 'security/detect-object-injection': 'warn',
    // 'security/detect-possible-timing-attacks': 'warn',
    // 'security/detect-pseudoRandomBytes': 'error',

    // JSON processing security
    'no-prototype-builtins': 'error',
    'no-empty-character-class': 'error',

    // Node.js specific security
    'no-new-require': 'error',

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

    // === PERFORMANCE ===
    'prefer-spread': 'error',
    'prefer-template': 'error',
    'prefer-object-spread': 'error',

    // === MODERN JAVASCRIPT ===
    'prefer-rest-params': 'error',
    'prefer-destructuring': ['error', { object: true, array: false }],
    'prefer-arrow-callback': 'error',
    'prefer-object-has-own': 'error',
    'prefer-numeric-literals': 'error',
    'logical-assignment-operators': 'error',
    'no-promise-executor-return': 'error',

    // === CLI-SPECIFIC ===
    // Input/Output consistency
    'eol-last': 'error',
    'no-trailing-spaces': 'error',
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],

    // === STYLE ===
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

    // === NODE.JS SPECIFIC ===
    'no-process-exit': 'warn',
    'no-process-env': 'warn', // Flag for security review
    'no-sync': 'warn'
  },
  overrides: [
    {
      // Test files can be more lenient
      files: ['**/tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-console': 'off',
        'max-len': 'off',
        'no-sync': 'off',
        'security/detect-non-literal-regexp': 'off',
        'security/detect-object-injection': 'off'
      }
    }
  ]
};