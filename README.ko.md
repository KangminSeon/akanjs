# Akan.js

Akan.js는 하나의 워크스페이스에서 비즈니스 애플리케이션을 만들기 위한 Bun 우선 풀스택 TypeScript 프레임워크입니다.

비즈니스 구조를 한 번 정의하면 Akan이 page, UI, API call, server service, store, data contract, mobile target, deployment artifact, framework convention을 함께 연결합니다.

[English](./README.md) | [문서](https://akanjs.com) | [패키지](https://www.npmjs.com/package/akanjs) | [Discord](https://discord.gg/pc228BhWmM)

## 왜 Akan.js인가요?

- 하나의 TypeScript 워크스페이스에서 web, app-oriented client, server runtime, data contract, infrastructure output을 함께 다룹니다.
- model, service, signal, store, template, view, utility 코드를 한곳에 모으는 convention-driven module 구조를 제공합니다.
- workspace 생성, app structure scan, local app 실행, package build, deployment 준비를 위한 CLI workflow를 제공합니다.
- React 19, Bun, server runtime, optional Capacitor target, generated framework facet을 하나의 project model 안에서 사용합니다.
- application, shared library, framework package, docs, benchmark, infra template 개발에 맞는 monorepo-native 구조를 제공합니다.

## 빠른 시작

새 Akan 워크스페이스를 생성합니다.

```bash
bunx create-akan-workspace
```

또는 CLI를 전역으로 설치할 수 있습니다.

```bash
bun install -g @akanjs/cli
akan create-workspace myorg --app myapp
cd myorg
akan start myapp --open
```

로컬 Akan gateway는 기본적으로 `http://localhost:8282`에서 실행됩니다.

## 이 저장소에서 개발하기

이 저장소에는 Akan.js framework package, documentation app, shared library, benchmark, deployment template이 포함되어 있습니다.

요구사항:

- Bun `>=1.3.13`
- local service 또는 native app build를 다룰 때만 Docker, Android Studio, Xcode가 필요합니다.

의존성을 설치합니다.

```bash
bun install
```

문서 앱을 실행합니다.

```bash
bun run akan start akan
```

문서 앱을 빌드합니다.

```bash
bun run akan build akan
```

로컬 소스에서 CLI를 빌드하고 실행합니다.

```bash
bun run buildAkan
bun run runAkan --help
```

## 저장소 구조

```text
apps/                  Akan application, public docs app 포함
libs/                  shared application 및 utility library
pkgs/akanjs/           public `akanjs` framework package
pkgs/@akanjs/cli/      Akan CLI package
pkgs/create-akan-workspace/
                       workspace generator package
benchmarks/            runtime 및 framework benchmark
infra/                 Helm chart, deployment template, Jenkins script
```

## 핵심 패키지

- `akanjs`: framework runtime, client/server facet, UI primitive, signal/store/service layer, test utility, generated export를 제공합니다.
- `@akanjs/cli`: application, module, library, package, cloud, workspace automation을 위한 command-line workflow를 제공합니다.
- `create-akan-workspace`: 새 Akan project를 시작하기 위한 starter workspace generator입니다.

## 개발 참고

- 이 저장소의 로컬 소스로 CLI 동작을 테스트할 때는 `bun run akan <command>`를 사용합니다.
- 생성된 워크스페이스에서 설치된 CLI를 사용할 때는 `akan <command>`를 사용합니다.
- application code는 `apps/<app>`, shared code는 `libs/`, framework code는 `pkgs/akanjs` 아래에 둡니다.
- generated facet index는 Akan scan/build workflow가 관리하므로 직접 수정하지 않습니다.

## 기여하기

Issue, discussion, bug report, documentation 개선, 집중된 pull request를 환영합니다.

Pull request를 열기 전에 다음을 확인해 주세요.

1. 변경 범위를 하나의 framework area 또는 user-facing behavior로 좁혀 주세요.
2. runtime behavior, package contract, CLI output에 영향을 주는 변경은 test를 추가하거나 갱신해 주세요.
3. 변경한 app 또는 package에 맞는 Akan command를 실행해 주세요.
4. 변경 동기와 user-visible impact를 설명해 주세요.

## 라이선스

Akan.js framework package는 MIT license로 배포됩니다. `pkgs/akanjs/LICENSE`를 참고해 주세요.
