import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const reactHooksPlugin = reactHooks.default ?? reactHooks
const reactRefreshPlugin = reactRefresh.default ?? reactRefresh

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      ...reactHooksPlugin.configs['recommended-latest'].rules,
      ...reactRefreshPlugin.configs.vite.rules,
      // Convención del proyecto: un parámetro sin usar con prefijo _ es intencional (interfaz
      // de Transform compartida, callbacks de mupdf que no necesitan todos sus argumentos).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
)
