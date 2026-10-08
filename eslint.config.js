import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // public/pyodide is copied from node_modules by scripts/copy-pyodide.mjs
  globalIgnores(['dist', 'public/pyodide']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Context modules export their hook next to the provider.
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['useAuth', 'useTheme', 'useReaderConfig', 'useReaderFeatures'] },
      ],
    },
  },
])
