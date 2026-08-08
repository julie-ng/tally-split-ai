# Evals

Promptfoo eval suites for the LLM steps in the receipt pipeline. See `evals/*.promptfooconfig.yaml` for the active suites; run via `npm run eval:annotations`, `npm run eval:adjust-expense`, `npm run eval:payer`.

> [!IMPORTANT]
> These evals call the **real production functions and prompts** from the app's source tree (`server/utils/llm/*.js`, `trigger/instructions/*.md`) — nothing here reimplements prompt assembly or logic. A suite breaks when the actual pipeline behavior changes, not just when someone edits this directory.

## Structure

- `*.promptfooconfig.yaml` — one config per suite (annotations, adjust-expense, payer), each pointing at its own provider and test files
- `providers/` — custom promptfoo providers. Each one imports and calls the real production function directly (e.g. `analyzeAnnotations()`, `adjustExpense()` from `server/utils/llm/`), which in turn loads the real prompt from `trigger/instructions/*.md` via `loadInstructions()`
- `assertions/` — custom JS assertions, one per thing being checked (annotations match, adjusted totals match, payer matches). Each reads its case's `*.expected.json` fixture and compares
- `tests/{suite}/` — one YAML per case, wiring a `caseDir` var to an assertion
- `datasets/` — gitignored (real, anonymized receipt photos + OCR data — semi-personal info, not for open source). One folder per case: `{shortId}-{description}/`, containing the photo, OCR fixture, and `*.expected.json` files for each suite
- `utils/` — small shared helpers (e.g. deriving a case's short ID from its folder name), with their own tests

Copy `household.sample.json` to `household.json` (gitignored) before running the payer suite.

## Not yet tested

Candidate cases for the payer-matching suite (`payer.promptfooconfig.yaml`), not yet covered by a fixture:

- **Both members' initials on the same receipt** — every current case has at most one identity signal. Untested: whether the model correctly picks the *payer* signal over an *item-owner* signal when both members' initials appear (e.g. "Bob owes Alice" alongside item-ownership marks), rather than just matching the first initials it sees.
- **Custom instructions without any handwriting** — the prompt supports non-card household rules (e.g. "restaurant receipts are always Matthew's") driving `paidBy` even when the receipt has no annotations at all. No current fixture exercises the `customInstructions`-only path.
- **Printed tax-code false positive** — the prompt has an explicit rule not to treat printed `A`/`B` tax-rate codes as handwritten initials. No fixture currently tests that a receipt with a printed tax code doesn't produce a spurious payer match.
- **Single-letter noise vs. real initials** — the prompt requires initials to be 2+ characters. No fixture currently has a stray single-character mark to confirm it's correctly ignored (`pggm4knx`'s `"MJ?"` is 3 characters, so doesn't exercise this).

Card-digit payer matching (`customInstructions` mapping a card's last 4 digits to a person) is explicitly out of scope for now — that logic lives in free-text `customInstructions`, not structured enough to assert against yet.
