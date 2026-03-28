// @ts-check
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import path from 'path';
import tseslint from 'typescript-eslint';
import jest from 'eslint-plugin-jest';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default tseslint.config(
  {
    ignores: ['bin/**', 'dist/**', 'coverage/**', 'node_modules/**', 'jest.config.js', 'eslint.config.mjs'],
  },

  // Airbnb base JS rules via legacy compatibility layer
  ...compat.extends('airbnb-base'),

  // TypeScript-ESLint recommended + type-checked rules
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: { extensions: ['.js', '.ts'] },
      },
    },
    rules: {
      'quote-props': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
      // Allow TypeScript files without explicit extensions in imports
      'import/extensions': [
        'error',
        'ignorePackages',
        { ts: 'never', tsx: 'never' },
      ],
    },
  },

  // Jest rules for test files
  {
    files: ['test/**/*.ts', '**/*.test.ts'],
    ...jest.configs['flat/recommended'],
    languageOptions: {
      globals: jest.environments.globals.globals,
    },
  },

  // Prettier: disables formatting rules that conflict (always last)
  prettier,
);
