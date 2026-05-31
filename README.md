# Akan.js

Akan.js is a Bun-first full-stack TypeScript framework for building business applications from one workspace.

Define the business shape once, then let Akan connect the surrounding surfaces: pages, UI, API calls, server services, stores, data contracts, mobile targets, deployment artifacts, and framework conventions.

[한국어](./README.ko.md) | [Documentation](https://akanjs.com) | [Package](https://www.npmjs.com/package/akanjs) | [Discord](https://discord.gg/pc228BhWmM)

## Why Akan.js?

- One TypeScript workspace for web, app-oriented clients, server runtime, data contracts, and infrastructure output.
- Convention-driven modules for keeping model, service, signal, store, template, view, and utility code together.
- Built-in CLI workflows for creating workspaces, scanning app structure, running local apps, building packages, and preparing deployments.
- React 19, Bun, server runtime, optional Capacitor targets, and generated framework facets under one project model.
- Monorepo-native development for applications, shared libraries, framework packages, docs, benchmarks, and infra templates.

## Quick Start

Create a new Akan workspace:

```bash
bunx create-akan-workspace
```

Or install the CLI globally:

```bash
bun install -g akanjs
akan create-workspace myorg --app myapp
cd myorg
akan start myapp --open
```

The local Akan gateway runs at `http://localhost:8282` by default.

## Working On This Repository

This repository contains the Akan.js framework packages, the documentation app, shared libraries, benchmarks, and deployment templates.

Requirements:

- Bun `>=1.3.13`
- Docker, Android Studio, or Xcode only when working on local services or native app builds

Install dependencies:

```bash
bun install
```

Run the documentation app:

```bash
bun run akan start akan
```

Build the documentation app:

```bash
bun run akan build akan
```

Build and run the local CLI from source:

```bash
bun run buildAkan
bun run runAkan --help
```

## Repository Layout

```text
apps/                  Akan applications, including the public docs app
libs/                  Shared application and utility libraries
pkgs/akanjs/           The public `akanjs` framework package
pkgs/@akanjs/cli/      The Akan CLI package
pkgs/create-akan-workspace/
                       Workspace generator package
benchmarks/            Runtime and framework benchmarks
infra/                 Helm charts, deployment templates, and Jenkins scripts
```

## Core Packages

- `akanjs`: framework runtime, client/server facets, UI primitives, signal/store/service layers, test utilities, and generated exports.
- `@akanjs/cli`: command-line workflows for applications, modules, libraries, packages, cloud, and workspace automation.
- `create-akan-workspace`: starter workspace generator for new Akan projects.

## Development Notes

- Use `bun run akan <command>` from this repository when testing CLI behavior against local source.
- Use `akan <command>` in generated workspaces when working with an installed CLI.
- Keep application code under `apps/<app>`, shared code under `libs/`, and framework code under `pkgs/akanjs`.
- Generated facet indexes are maintained by Akan scan/build workflows; avoid hand-editing generated index files.

## Contributing

Issues, discussions, bug reports, documentation improvements, and focused pull requests are welcome.

Before opening a pull request:

1. Keep the change scoped to one framework area or user-facing behavior.
2. Add or update tests when the change affects runtime behavior, package contracts, or CLI output.
3. Run the relevant Akan command for the touched app or package.
4. Describe the motivation and user-visible impact of the change.

## License

The Akan.js framework packages are published under the MIT license. See `pkgs/akanjs/LICENSE`.
