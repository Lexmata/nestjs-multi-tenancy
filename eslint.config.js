import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import n from 'eslint-plugin-n';
import perfectionist from 'eslint-plugin-perfectionist';
import promise from 'eslint-plugin-promise';
import regexp from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'docs/**', 'schematics/**', '*.js', '*.cjs', '*.mjs'],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Plugin configs
  promise.configs['flat/recommended'],
  regexp.configs['flat/recommended'],
  sonarjs.configs.recommended,
  unicorn.configs['flat/recommended'],

  // Main configuration
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      n,
      perfectionist,
      security,
    },

    rules: {
      // ==========================================
      // TypeScript ESLint Rules
      // ==========================================
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-extraneous-class': 'off', // NestJS uses classes extensively
      '@typescript-eslint/unbound-method': 'off', // Conflicts with NestJS DI patterns
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],

      // ==========================================
      // Node.js Rules
      // ==========================================
      'n/no-missing-import': 'off', // TypeScript handles this
      'n/no-unpublished-import': 'off', // Allow dev dependencies in tests
      'n/no-unsupported-features/es-syntax': 'off', // Using transpilation
      'n/no-process-exit': 'error',
      'n/prefer-global/buffer': ['error', 'always'],
      'n/prefer-global/console': ['error', 'always'],
      'n/prefer-global/process': ['error', 'always'],
      'n/prefer-promises/fs': 'error',

      // ==========================================
      // Promise Rules
      // ==========================================
      'promise/always-return': 'off',
      'promise/catch-or-return': 'error',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/no-nesting': 'warn',

      // ==========================================
      // Security Rules
      // ==========================================
      'security/detect-object-injection': 'off', // Too many false positives
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-possible-timing-attacks': 'warn',

      // ==========================================
      // SonarJS Rules (Code Quality)
      // ==========================================
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-nested-template-literals': 'off',

      // ==========================================
      // Unicorn Rules (Modern Best Practices)
      // ==========================================
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off', // null is valid in many APIs
      'unicorn/prefer-module': 'off', // CommonJS output
      'unicorn/no-useless-undefined': 'off',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            kebabCase: true,
            pascalCase: true,
          },
        },
      ],
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/prefer-spread': 'off',
      'unicorn/import-style': 'off',
      'unicorn/switch-case-braces': ['error', 'avoid'],

      // ==========================================
      // Perfectionist Rules (Sorting)
      // ==========================================
      'perfectionist/sort-interfaces': 'off', // Can be disruptive in existing code
      'perfectionist/sort-object-types': 'off',
      'perfectionist/sort-union-types': 'off',

      // ==========================================
      // Regexp Rules
      // ==========================================
      'regexp/no-super-linear-backtracking': 'error',
      'regexp/no-control-character': 'error',
      'regexp/no-dupe-disjunctions': 'error',
      'regexp/optimal-quantifier-concatenation': 'warn',

      // ==========================================
      // General Best Practices
      // ==========================================
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'no-param-reassign': 'error',
      'no-nested-ternary': 'warn',
      'no-unneeded-ternary': 'error',
      'spaced-comment': ['error', 'always'],
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
      'no-trailing-spaces': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'array-callback-return': 'error',
      'default-case-last': 'error',
      'default-param-last': 'error',
      'dot-notation': 'error',
      'grouped-accessor-pairs': ['error', 'getBeforeSet'],
      'no-caller': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-implied-eval': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-new': 'error',
      'no-new-func': 'error',
      'no-new-wrappers': 'error',
      'no-proto': 'error',
      'no-return-assign': 'error',
      'no-script-url': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-regex-literals': 'error',
      radix: 'error',
      'require-await': 'off', // TypeScript handles this better
      yoda: 'error',
    },
  },

  // Test files configuration
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      // Relax rules for test files
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-identical-functions': 'off',
      'sonarjs/no-nested-functions': 'off',
      'security/detect-possible-timing-attacks': 'off',
      'no-console': 'off',
    },
  },

  // Prettier must be last to override formatting rules
  eslintConfigPrettier,
);
