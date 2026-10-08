import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  { ignores: ['dist/**', 'out/**', 'node_modules/**', '.vscode-test/**'] },
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    },
    plugins: { '@stylistic': stylistic },
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          'selector': 'memberLike',
          'modifiers': [
            'requiresQuotes'
          ],
          'format': null
        },
        {
          'selector': 'default',
          'format': [
            'camelCase'
          ],
          'leadingUnderscore': 'allow',
          'trailingUnderscore': 'allow'
        },
        {
          'selector': 'variable',
          'format': [
            'camelCase',
            'UPPER_CASE'
          ],
          'leadingUnderscore': 'allow',
          'trailingUnderscore': 'allow'
        },
        {
          'selector': 'typeLike',
          'format': [
            'PascalCase'
          ]
        },
        {
          'selector': 'enumMember',
          'format': [
            'PascalCase'
          ]
        }
      ],
      '@stylistic/semi': [
        'warn',
        'never'
      ],
      'no-case-declarations': 'off',
      'curly': [
        'warn',
        'multi-or-nest',
        'consistent'
      ],
      'eqeqeq': 'warn',
      '@stylistic/no-floating-decimal': 'warn',
      '@stylistic/no-multi-spaces': 'warn',
      'yoda': [
        'warn',
        'never',
        {
          'exceptRange': true
        }
      ],
      'no-shadow': 'off',
      '@stylistic/array-bracket-newline': [
        'warn',
        'consistent'
      ],
      '@stylistic/brace-style': [
        'warn',
        '1tbs'
      ],
      '@stylistic/comma-spacing': [
        'warn',
        {
          'before': false,
          'after': true
        }
      ],
      'max-depth': [
        'warn',
        4
      ],
      'no-nested-ternary': 'warn',
      'no-unneeded-ternary': 'warn',
      '@stylistic/quotes': [
        'warn',
        'single'
      ],
      '@stylistic/space-before-function-paren': [
        'warn',
        {
          'anonymous': 'ignore',
          'named': 'never',
          'asyncArrow': 'always'
        }
      ],
      '@stylistic/space-in-parens': [
        'warn',
        'never'
      ],
      '@stylistic/space-unary-ops': [
        'warn',
        {
          'words': true,
          'nonwords': false
        }
      ],
      '@stylistic/spaced-comment': [
        'warn',
        'always'
      ],
      '@stylistic/switch-colon-spacing': [
        'error',
        {
          'before': false,
          'after': true
        }
      ],
      'arrow-body-style': [
        'warn',
        'as-needed'
      ],
      '@stylistic/arrow-parens': [
        'warn',
        'as-needed'
      ],
      '@stylistic/array-bracket-spacing': 'warn',
      'no-duplicate-imports': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-spread': 'warn',
      'prefer-template': 'warn',
      '@stylistic/template-curly-spacing': [
        'warn',
        'never'
      ],
      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'require-await': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_'
        }
      ]
    }

  }
])
