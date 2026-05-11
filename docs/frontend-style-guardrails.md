# Frontend Style Guardrails

## Native button styling

Do not add broad global rules that style every native `button`.

Use explicit classes for non-Element Plus buttons:

- Primary legacy buttons may rely on `button:not([class])`.
- Secondary buttons must use `.secondary`.
- Table/link actions must use `.row-link-btn`, `.list-action-btn`, or `.link-btn`.
- Icon-only actions must use a dedicated class such as `.icon-action-btn`.
- Plain remove/close actions must use their own transparent class and must not inherit primary button styles.

Why: broad selectors such as `button:not(.el-button)` will also hit small component controls, including attachment remove buttons. This turns plain icons into blue primary buttons and is hard to diagnose from the component file alone.

Before changing a small action button, inspect both the component scoped CSS and `frontend/src/style.css`.
