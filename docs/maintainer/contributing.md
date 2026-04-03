# Contributing

Guide for contributing to `@lexmata/nestjs-multi-tenant`. This is a shared library
consumed by `lexmata-app-backend` and `lexmata-admin-backend` -- changes here affect
both production services.

## Prerequisites

- Node.js >= 20.0.0
- pnpm 10.x (specified in `packageManager` field)
- Docker (for integration tests with databases)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Lexmata/nestjs-multi-tenancy.git
cd nestjs-multi-tenancy

# Install dependencies
pnpm install

# Run tests to verify everything works
pnpm test

# Start the TypeScript compiler in watch mode for development
pnpm dev
```

## Branching Model

This project uses git-flow. There is no Jira prefix since this is a shared library.

| Branch type    | Branch from  | Merge to              | Naming                       |
|----------------|-------------|------------------------|------------------------------|
| `main`         | --          | --                     | Stable, release-ready        |
| `develop`      | --          | --                     | Integration branch           |
| `feature/*`    | `develop`   | `develop`              | `feature/add-kafka-strategy` |
| `release/*`    | `develop`   | `main` and `develop`   | `release/0.2.0`              |
| `hotfix/*`     | `main`      | `main` and `develop`   | `hotfix/fix-cache-eviction`  |

Never commit directly to `main`. All changes go through pull requests.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>
```

- **type:** `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`, `perf`
- **scope:** optional, e.g. `(middleware)`, `(guard)`, `(testing)`, `(eslint-plugin)`
- **subject:** imperative mood, lowercase, no trailing period, max 72 chars
- **body:** mandatory for non-trivial changes; explain why, not what

The repository has `commitlint` and `husky` configured. The pre-commit hook runs
`lint-staged` (ESLint + Prettier on staged `.ts` files).

Example:

```
fix(middleware): handle array-valued headers in cookie extraction

When the same header appears multiple times, Express populates
req.headers with a string array instead of a string. The cookie
strategy's manual header parser split on ';' without checking
the value type first, causing a TypeError.

Check typeof before parsing and join array values with '; ' to
match the browser's behavior for multiple Cookie headers.
```

## Development Workflow

### 1. Create a feature branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### 2. Make changes

Source code is in `src/`. Each directory has its own barrel `index.ts`. If you add a
new public export, add it to `src/index.ts`.

### 3. Write tests

Every source file must have a co-located `.spec.ts` file. For new features, write:

- **Unit tests** in the co-located spec file covering all branches and edge cases.
- **E2E tests** in `test/e2e/multi-tenant.e2e.spec.ts` if the feature changes the
  request lifecycle (extraction, resolution, validation, context propagation).

### 4. Run the full check suite

```bash
pnpm lint          # ESLint
pnpm format:check  # Prettier
pnpm test          # Unit + E2E tests
pnpm build         # TypeScript compilation
```

### 5. Open a pull request to `develop`

The CI pipeline runs on all PRs to `main`. It runs:

- Security audit (`pnpm audit`)
- Lint + format check
- Tests with coverage (Node.js 20 and 22 matrix)
- Build + package contents check

## Testing

### Running tests

```bash
pnpm test              # Run all tests once
pnpm test:watch        # Watch mode (re-runs on file changes)
pnpm test:coverage     # Run with coverage report
pnpm test:e2e          # Run only E2E tests
```

### Test architecture

Tests use Vitest with `globals: true` (no explicit imports needed for `describe`,
`it`, `expect`, `vi`).

- **Unit tests:** Co-located with source files (`src/**/*.spec.ts`). Test individual
  components in isolation with mocked dependencies.
- **E2E tests:** In `test/e2e/`. Boot a real NestJS application with supertest and
  exercise the full middleware pipeline.

### Coverage

Coverage is collected by `@vitest/coverage-v8`. The coverage report excludes test
files and barrel exports. Coverage is uploaded to Codecov on the Node.js 20 CI run.

### Testing utilities

The library ships test utilities at `@lexmata/nestjs-multi-tenant/testing`. If you
change `TenantContextService`'s public API, update `MockTenantContextService` in
`src/testing/index.ts` to match.

### Docker services for integration tests

`docker-compose.yml` provides PostgreSQL, MySQL, Redis, and Adminer for integration
testing:

```bash
docker compose up -d postgres redis   # Start only what you need
docker compose down                   # Stop all services
```

These are optional -- the standard test suite does not require any external services.

## Impact Assessment

Changes to this library affect all consuming services. Before submitting a PR,
consider:

### Breaking changes

Any change to the public API (types, exported functions, configuration options,
behavioral semantics) is a breaking change. Breaking changes must:

1. Use a `!` suffix in the commit type: `feat(middleware)!: remove deprecated header option`
2. Be documented in the PR description with a migration guide.
3. Be batched into a major version release.

### Consuming services

The following Lexmata services depend on this library:

| Service                    | How it uses multi-tenant                                       |
|----------------------------|---------------------------------------------------------------|
| `lexmata-app-backend`      | Primary consumer. Header extraction, Cognito JWT tenant claim, `TenantContextService` in Prisma queries, `TenantGuard` on all authenticated resolvers. |
| `lexmata-admin-backend`    | Admin API. Header extraction, tenant resolution against admin database, `TenantContextService` for cross-tenant admin operations. |

After publishing a new version, both services need to update their dependency and
verify their test suites pass. For breaking changes, coordinate with the backend team
before releasing.

### Non-breaking additions

New extraction strategies, optional configuration fields, new decorators, and new
testing utilities are non-breaking. These can ship as minor or patch versions.

## Code Standards

### No stub implementations

This project has zero tolerance for incomplete code:

- No `// TODO`, `// FIXME`, `// HACK` comments
- No empty catch blocks
- No functions that accept inputs but do not process them
- If something is too complex, break it down or defer the feature entirely

### No runtime dependencies

The library has zero runtime dependencies -- only NestJS peer dependencies. This is
intentional. Do not add `lodash`, `lru-cache`, or similar packages. If you need
utility functions, implement them inline.

### Platform abstraction

All request handling must work with both Express and Fastify. Use the
`PlatformRequest` interface in the middleware. Do not import Express or Fastify types
directly in library code (dev dependencies for tests are fine).

### ESLint configuration

The project uses flat ESLint config (`eslint.config.js`) with an extensive rule set
including `sonarjs`, `security`, `unicorn`, `perfectionist`, and `regexp` plugins.
Run `pnpm lint:fix` to auto-fix issues.

### Formatting

Prettier handles formatting. Run `pnpm format` to format all source files. The
pre-commit hook runs Prettier on staged files automatically.

## Publishing a Release

### Automated release (standard path)

1. Merge all feature branches to `develop`.
2. Create a release branch: `git checkout -b release/X.Y.Z develop`
3. Bump the version: `pnpm version X.Y.Z` (this runs `preversion` lint+test
   automatically, then `postversion` pushes the commit and tag).
4. The `postversion` script pushes the tag, which triggers the `release.yml` GitHub
   Actions workflow.
5. The workflow runs tests, builds, publishes to npm, generates a changelog with
   `git-cliff`, and creates a GitHub Release.
6. Merge the release branch to both `main` and `develop`.

### Manual release (emergency)

If the automated pipeline fails:

```bash
# Ensure you are on the release branch with the version bumped
pnpm run prepublishOnly    # lint + test + build
pnpm publish --access public
```

You need an npm token with publish permissions for the `@lexmata` scope.

### Version strategy

- **Patch** (`0.1.x`): Bug fixes, documentation, internal refactoring
- **Minor** (`0.x.0`): New features, new extraction strategies, new options
- **Major** (`x.0.0`): Breaking changes to public API or behavior

The library is currently pre-1.0 (`0.1.x`), so minor versions may include breaking
changes per semver conventions. Once 1.0 is released, strict semver applies.

## CI/CD Workflows

| Workflow   | Trigger                     | Purpose                                    |
|------------|-----------------------------|--------------------------------------------|
| `ci.yml`   | Push to `main`, PRs to `main` | Security audit, lint, test (Node 20+22), build |
| `release.yml` | Push tag `v*`            | Test, build, publish to npm, GitHub Release |
| `codeql.yml` | Push to `main`/`develop`, PRs, weekly | CodeQL security analysis          |
| `docs.yml`  | Push to `main` (docs/ changes) | Build and deploy Angular docs site to GitHub Pages |

## Documentation

### Consumer docs

The README is the primary consumer-facing documentation. The `docs/` directory
contains an Angular application deployed to GitHub Pages that provides a browsable
version of the API documentation (generated by TypeDoc).

### Maintainer docs

This directory (`docs/maintainer/`) contains internal documentation:

- `architecture.md` -- internal library structure and data flow
- `troubleshooting.md` -- common issues and debugging techniques
- `contributing.md` -- this file

### TypeDoc

API documentation is generated from source TSDoc comments:

```bash
pnpm docs:api    # Generates docs/src/assets/api.json
```

Keep TSDoc comments on all public exports up to date.
