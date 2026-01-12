import globals from 'globals'
import withNuxt from './.nuxt/eslint.config.mjs'
import stylistic from '@stylistic/eslint-plugin'

// For details, see
// https://eslint.nuxt.com/packages/module
export default withNuxt(
  {
    // `env` doesn't exist for flag config :-(
    // env: {
    //   browser: true,
    //   node: true,
    // },
    plugins: {
      '@stylistic': stylistic
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        defineEventHandler: true,
        defineNitroPlugin: true
      }
    },
    rules: {
      semi: 'off',
      'no-prototype-builtins': 'off',
      'vue/require-default-prop': 'off',
      'vue/attribute-hyphenation': ['warn', 'never'], // TODO
      'no-unused-vars': ['error', { 'args': 'none' }],
      '@typescript-eslint/no-unused-vars': 'off',
      '@stylistic/brace-style': ['error', 'stroustrup'],
      '@stylistic/jsx-indent-props': ['warn', 2],
      '@stylistic/jsx-max-props-per-line': ['warn', { "maximum": 3 }],
      '@stylistic/no-multi-spaces': ['error', { ignoreEOLComments: true }],
      '@stylistic/space-before-function-paren': ['error', 'always']
    }
  }
)


// https://eslint.style/rules/jsx-indent-props
