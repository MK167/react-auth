# Commit Checker Setup Guide

A reusable step-by-step guide to apply **Husky + lint-staged + commitlint** to any project.

---

## What You Get

| Hook | Trigger | Does |
|------|---------|------|
| `pre-commit` | Before commit lands | ESLint fix + TypeScript type check on staged files |
| `commit-msg` | After you type the message | Validates conventional commit format |

---

## Step 1 — Install Dependencies

```bash
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional
```

> For Yarn: `yarn add -D husky lint-staged @commitlint/cli @commitlint/config-conventional`
> For pnpm: `pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional`

---

## Step 2 — Initialize Husky

```bash
npx husky init
```

This automatically:
- Creates the `.husky/` folder
- Creates `.husky/pre-commit` with a placeholder
- Adds `"prepare": "husky"` to `package.json` scripts

---

## Step 3 — Configure the pre-commit Hook

Replace the contents of `.husky/pre-commit`:

```bash
npx lint-staged
```

---

## Step 4 — Create the commit-msg Hook

```bash
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

Or create `.husky/commit-msg` manually with:

```bash
npx --no -- commitlint --edit $1
```

---

## Step 5 — Create `commitlint.config.js`

> If your project has `"type": "module"` in `package.json` use ESM syntax.
> If not (CommonJS), use `module.exports = { ... }` instead.

**ESM (type: module):**

```js
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'docs',
        'refactor',
        'style',
        'test',
        'perf',
        'ci',
        'revert',
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
```

**CommonJS (no type: module):**

```js
// commitlint.config.cjs
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat','fix','chore','docs','refactor','style','test','perf','ci','revert']],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
```

---

## Step 6 — Create `lint-staged.config.js`

### TypeScript + React project

```js
// lint-staged.config.js
export default {
  'src/**/*.{ts,tsx}': (files) => [
    `eslint --fix ${files.join(' ')}`,
    'tsc -p tsconfig.app.json --noEmit',
  ],
};
```

### JavaScript-only project (no TypeScript)

```js
export default {
  'src/**/*.{js,jsx}': ['eslint --fix'],
};
```

### With Prettier

```js
export default {
  'src/**/*.{ts,tsx,js,jsx}': ['prettier --write', 'eslint --fix'],
  'src/**/*.{ts,tsx}': () => 'tsc -p tsconfig.app.json --noEmit',
};
```

> **Note:** The function form `() => 'tsc ...'` ignores the file list — this forces tsc to
> check the whole project, not just staged files (tsc doesn't work on isolated files).

---

## Step 7 — Verify `package.json`

Make sure `prepare` exists in scripts:

```json
"scripts": {
  "prepare": "husky"
}
```

Husky init adds this automatically — just double-check it's there.

---

## Step 8 — Smoke Test

Test a **valid** message:

```bash
echo "feat(auth): add login page" | npx commitlint
# → no output = ✅ valid
```

Test an **invalid** message:

```bash
echo "some random message" | npx commitlint
# → ✖ type may not be empty
# → ✖ subject may not be empty
# → ❌ blocked
```

---

## Conventional Commit Format

```
<type>(<scope>): <short description>

feat(auth): add Google OAuth login
fix(cart): correct total price calculation
chore(deps): update axios to v1.7
docs: update README setup steps
refactor(store): simplify auth slice actions
```

### Allowed Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Tooling, deps, config — no production code |
| `docs` | Documentation only |
| `refactor` | Code change with no feature or bug fix |
| `style` | Formatting, whitespace — no logic change |
| `test` | Adding or fixing tests |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline config |
| `revert` | Revert a previous commit |

### Scope (optional)

Scope is the area of the codebase affected — use folder or feature names:

```
feat(auth): ...
fix(cart): ...
chore(deps): ...
refactor(store): ...
```

---

## Full Flow — What Happens on Every Commit

```
git commit -m "feat(auth): add login page"
        ↓
  .husky/pre-commit fires
        ↓
  lint-staged runs on staged src/**/*.{ts,tsx}
    ├── eslint --fix      → auto-fixes lint issues
    └── tsc --noEmit      → type checks entire project
        ↓
  .husky/commit-msg fires
        ↓
  commitlint validates message format
        ↓
  ✅ commit lands  /  ❌ blocked with clear error
```

---

## Troubleshooting

### Hooks not running
```bash
# Re-install hooks
npm run prepare
# or
npx husky
```

### commitlint: "Cannot find module" error
Make sure you used the right config file extension:
- `commitlint.config.js` for ESM projects (`"type": "module"`)
- `commitlint.config.cjs` for CommonJS projects

### tsc fails on unrelated files
lint-staged runs `tsc --noEmit` on the whole project — this is intentional.
Fix the type errors or temporarily remove the tsc line from `lint-staged.config.js`.

### Skip hooks in an emergency (use sparingly)
```bash
git commit -m "fix: hotfix" --no-verify
```

---

## Files Checklist

```
✅ .husky/pre-commit          → npx lint-staged
✅ .husky/commit-msg          → npx --no -- commitlint --edit $1
✅ commitlint.config.js       → rules + extends
✅ lint-staged.config.js      → eslint + tsc on staged files
✅ package.json               → "prepare": "husky" in scripts
```
