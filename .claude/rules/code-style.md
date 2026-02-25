# Code Style

ESLint is configured via the Nuxt ESLint module with `@stylistic/eslint-plugin`. See `eslint.config.mjs` for details.

## Formatting

- No semicolons
- Trailing commas required

## File Naming

- Reusable utility/helper functions: `.utils.js` suffix (e.g., `filename.utils.js`)
- Corresponding tests: `.utils.test.js` suffix (e.g., `filename.utils.test.js`)
- Generate tests wherever possible

## Utility Placement

| Location | Purpose |
|:--|:--|
| `app/utils/` | Frontend-only (UI helpers, badge styles) |
| `server/utils/` | Backend-only (Azure SDK wrappers, auth helpers) |
| `shared/utils/` | Both client and server (text, string, date manipulation) |

## Language

- JavaScript, not TypeScript (project is evaluating TypeScript for future adoption)
- Use the Factory/Composable Pattern for complex objects — see `app/composables/useUploadObject.js`
