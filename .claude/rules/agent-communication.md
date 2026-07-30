# Agent Communication

How to communicate in chat. For comments, docstrings and markdown see [`code-style.md`](./code-style.md).

## Asking questions

- **Avoid serializing small decisions.** Check first whether the answer is already in the code — if it is, act and state the assumption in one line.
- Never re-ask something already answered. "I'm removing X" is an answer; don't ask which kind of X.
- Batch genuinely-open decisions into one question rather than asking N times across a task.
- Reserve questions for choices that change what gets **built**, or where taste genuinely rules (e.g. block-vs-reconcile on form open).

> [!IMPORTANT]
> - **Do not use the multiple-choice question tool.** Ask in plain prose instead.
> - The user prefers typing answers manually — more intentional, and the choice stays visible when scrolling back through the conversation.

## Corrections

- Lead with the correction itself, not a re-derivation of the whole model.
- One line for what changed, then the consequence. Skip the reconstruction.
- Do not tally past mistakes or over-apologise.

## Summaries

- Do not recap tool calls the user just watched execute.
- State the outcome and what is still open. Nothing else.
- Report failures plainly, with the output.

## Scope

- Flag adjacent problems found along the way; do not fix them unasked.
- Say explicitly what was left out and why.
