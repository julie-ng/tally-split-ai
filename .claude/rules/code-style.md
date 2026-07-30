# Code Style

ESLint is configured via the Nuxt ESLint module with `@stylistic/eslint-plugin`. See `eslint.config.mjs` for details.

## Formatting

- No semicolons
- Trailing commas required
- Always brace `if`/`else` — no single-line bodies. Multi-line ternaries; one prop per line
- Subpath imports for cross-boundary imports: `#shared/*`, `#server/*` — never `~~/`

## Comments & Docstrings

- No comments on self-explanatory code — skip the obvious restatement
- Never strip existing JSDoc/inline comments when refactoring; ask first if a comment seems stale
- Do not write "wall of prose" that is difficult to scan. Prefer a short paragraph and other info broken into bullet points for easier scannability. 
- Ensure non-obvious intent is clearly marked, i.e. add "IMPORTANT" above a dedicated bulleted list for info a user should not miss
- Reserve `IMPORTANT` for **load-bearing** facts — a deliberate omission that reads as an oversight, a value that looks safe to "fix". Not general emphasis; overuse makes it invisible
- When a **deliberate omission** is the enforcement mechanism, assert it in a test too — a comment can be ignored, a failing test cannot. Example: `_derivePermission` leaves `PATCH` unmapped on purpose, so a test asserts it returns `null`

## Docs / Markdown

- Prefer GitHub-style callouts (`NOTE|TIP|IMPORTANT|WARNING|CAUTION`) where appropriate over manual `**NOTE**`.
- Do not add hard line breaks.
- Do not write long winded prose or braindumps. Ensure text has clear scannable structure. Prefer short succinct phrases in bullet list format over long complete sentences in a wall of text.

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
