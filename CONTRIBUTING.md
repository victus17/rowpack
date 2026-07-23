# Contributing to Rowpack

Thanks for considering a contribution. Rowpack is deliberately small: one compiler, one runtime and one portable output file. The best changes protect that clarity.

## Before you start

- Search existing issues and discussions.
- Open a discussion before large UI, file-format or architectural changes.
- Keep generated files self-contained and free of runtime network requests.
- Avoid adding a dependency when a small, well-tested implementation is clearer.

## Local setup

You need Node.js 22.12 or newer and pnpm 11.

```bash
git clone https://github.com/victus17/rowpack.git
cd rowpack
corepack enable
pnpm install
pnpm dev
```

Run the full gate before opening a pull request:

```bash
pnpm check
```

For focused work:

```bash
pnpm test
pnpm test:e2e
pnpm format
```

## Pull requests

- Keep the change focused and explain the user problem.
- Add or update tests for behavior changes.
- Include before/after screenshots for visible interface changes.
- Update the README or docs when the public behavior changes.
- Use clear commit messages written in the imperative mood.

By contributing, you agree that your work is licensed under the MIT License.

## Reporting security problems

Please do not open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md) instead.
