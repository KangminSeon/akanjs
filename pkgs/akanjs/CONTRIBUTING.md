# Contributing to Akan.js

Thank you for your interest in contributing to Akan.js. This guide is a starting point for opening issues,
submitting pull requests, and keeping changes reviewable.

## Project Shape

Akan.js is a Bun-first TypeScript monorepo.

- `pkgs/akanjs`: framework package, runtime surfaces, CLI, devkit, and tooling.
- `apps`: application examples and product surfaces built with Akan.
- `libs`: shared domain and utility libraries.
- `infra`: deployment, Helm, edge, and CI/CD assets.

When changing framework code, prefer existing package subpaths and keep the root `akanjs` entrypoint small.
Runtime boundaries are part of the package design.

## Before You Start

- Search existing issues and pull requests before opening a new one.
- Keep changes focused on one concern at a time.
- Prefer existing patterns over new abstractions.
- Avoid broad formatting-only changes unless the pull request is explicitly about formatting.
- Do not commit secrets, generated credentials, local `.env` files, or private deployment values.

## Development

Install dependencies with Bun:

```bash
bun install
```

Useful commands:

```bash
bun run akan lint-all --fix=false
bun run akan build <appName>
bun run akan start <appName>
```

After changing application source code, verify the affected app when practical:

```bash
bun run akan start <appName>
bun run akan build <appName>
```

## Pull Request Guidelines

A good pull request should include:

- A short explanation of the problem and the approach.
- Screenshots or recordings for visible UI changes.
- Tests, examples, or manual verification notes for behavior changes.
- Notes about breaking changes, migration steps, or follow-up work.

Reviewers should be able to understand the change from the pull request description and the diff without
reverse-engineering unrelated context.

## Coding Style

- Use TypeScript and Bun-first workflows.
- Follow the existing file layout, naming conventions, and module boundaries.
- Use Biome formatting conventions used by the repository.
- Keep code readable six months from now: clear declarations beat clever shortcuts.
- Add comments only when they explain non-obvious behavior or decisions.

## Reporting Issues

When reporting a bug, include:

- The Akan.js version or commit.
- The Bun version and operating system.
- A minimal reproduction or the smallest code sample that shows the problem.
- Expected behavior and actual behavior.
- Relevant logs, stack traces, or screenshots.

For feature requests, describe the business problem first, then the API or behavior you would like to see.

## License

By contributing to this repository, you agree that your contributions will be licensed under the MIT License.
