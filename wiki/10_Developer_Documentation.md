# Developer Documentation Generation

This page explains how to generate the auto-built reference documentation for each layer of the Hackmanite stack.

There are three independent documentation generators, each covering a different part of the codebase:

| Layer | Tool | Output |
|---|---|---|
| Python NLP backend | MkDocs + mkdocstrings | `apps/nlp-service/site/` |
| TypeScript frontend & libraries | TypeDoc | `apps/web/docs/typedoc/` |
| Prisma database schema | Prisma Docs Generator | `apps/web/docs/prisma/` |

---

## 1. Python NLP Backend (`apps/nlp-service`)

Documentation is powered by **[MkDocs](https://www.mkdocs.org/)** with the **[mkdocstrings](https://mkdocstrings.github.io/)** plugin, which auto-generates API reference pages from Python docstrings.

### Install dev dependencies

```powershell
cd apps/nlp-service
pip install -r requirements-dev.txt
```

### Run the live dev server

Watches source files and hot-reloads the docs site in your browser:

```powershell
cd apps/nlp-service
mkdocs serve
```

Open **http://127.0.0.1:8000** in your browser.

### Build a static site

Produces a fully self-contained HTML site ready for hosting:

```powershell
cd apps/nlp-service
mkdocs build
```

Output: `apps/nlp-service/site/`

---

## 2. Next.js Frontend & Core Libraries (`apps/web`)

### TypeDoc — TypeScript API reference

**[TypeDoc](https://typedoc.org/)** parses all TypeScript source files and generates an HTML reference for every exported type, function, class, and interface.

```powershell
cd apps/web
npm run docs:generate
```

Output: `apps/web/docs/typedoc/`

> Open `apps/web/docs/typedoc/index.html` directly in a browser — no server needed.

Configuration is defined in [`apps/web/typedoc.json`](../apps/web/typedoc.json).

### Prisma Docs Generator — Database schema reference

The **[Prisma Docs Generator](https://github.com/pantharshit00/prisma-docs-generator)** is wired into `prisma generate` and produces an interactive schema reference automatically whenever you run:

```powershell
cd apps/web
npx prisma generate
```

Output: `apps/web/docs/prisma/`

> This runs automatically as part of the Docker build and during `npx prisma db push`, so the schema docs are always kept in sync with the Prisma schema.

---

## Output Summary

| Command | Where to run | Output location |
|---|---|---|
| `mkdocs serve` | `apps/nlp-service` | http://127.0.0.1:8000 (live) |
| `mkdocs build` | `apps/nlp-service` | `apps/nlp-service/site/` |
| `npm run docs:generate` | `apps/web` | `apps/web/docs/typedoc/` |
| `npx prisma generate` | `apps/web` | `apps/web/docs/prisma/` |

---

## Notes

- The `apps/nlp-service/site/` and `apps/web/docs/typedoc/` directories are **not committed** to the repository (listed in `.gitignore`). They are always generated on demand.
- The `apps/web/docs/prisma/` output is also auto-generated and should not be manually edited.
- To keep docs accurate, re-run the relevant generator after any significant change to docstrings, TypeScript exports, or the Prisma schema.
