// Flat ESLint config (ESLint 9). Type-aware linting for all workspace packages.
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      'spec/pint-ae-billing/**',
      // The playground app has its own TypeScript project and tsc check.
      'apps/**',
      // Standalone runnable examples are not part of a package tsconfig project.
      'examples/**',
      // Node build scripts.
      'scripts/**',
      '**/*.config.{js,ts,mjs,cjs}',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: ['./packages/*/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // TypeScript's own checker handles undefined identifiers; the core ESLint
      // rule has no type info and false-positives on Node globals.
      'no-undef': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  prettier,
];
