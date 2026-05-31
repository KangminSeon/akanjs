import { usePage } from "@apps/akan/client";
import { Code, Docs } from "@apps/akan/ui";
import { Scroll } from "@libs/util/ui";
import { Link } from "akanjs/ui";

export default function Page() {
  const { l } = usePage();
  return (
    <Scroll>
      <Scroll.Slide id="mobile-overview" title={l.trans({ en: "Mobile App Architecture", ko: "모바일 앱 아키텍처" })}>
        <Docs.Title>{l.trans({ en: "Mobile App Architecture", ko: "모바일 앱 아키텍처" })}</Docs.Title>
        <Docs.Description>
          <div>
            {l.trans({
              en: "Akan mobile apps are built by opening a CSR web client inside a Capacitor native shell, then packaging that shell as Android and iOS apps. The screen is developed with the same Akan UI system, while Capacitor provides the native project, app identity, and device bridge.",
              ko: "Akan 모바일 앱은 CSR 웹 클라이언트를 Capacitor 네이티브 shell 안에서 열고, 이를 Android와 iOS 앱으로 패키징하는 방식입니다. 화면은 같은 Akan UI 시스템으로 개발하고, Capacitor가 네이티브 프로젝트, 앱 식별 정보, 디바이스 브리지를 제공합니다.",
            })}
          </div>
          <Docs.Mermaid
            title="Akan mobile architecture"
            chart={`flowchart LR
  akanApp["Akan App"] --> basePath["basePath CSR Client"]
  basePath --> capacitor["Capacitor Native Shell"]
  capacitor --> android["Android Package"]
  capacitor --> ios["iOS Package"]
  android --> backend["Shared Akan Backend"]
  ios --> backend`}
          />
          <div>
            {l.trans({
              en: "If the app declares multiple basePaths, one Akan app can release multiple mobile packages. For example, a customer app, an admin stock app, and a field worker app can each open a different basePath while sharing the same services, permissions, database rules, and generated fetch calls.",
              ko: "앱이 여러 basePath를 선언하면 하나의 Akan app에서 여러 모바일 패키지를 릴리즈할 수 있습니다. 예를 들어 고객 앱, 관리자 재고 앱, 현장 작업자 앱은 서로 다른 basePath를 열면서도 같은 service, permission, database rule, generated fetch 호출을 공유할 수 있습니다.",
            })}
          </div>
          <Code.Snippet
            title="apps/myapp/akan.config.ts"
            code={`import type { AppConfig } from "akanjs";

const config: AppConfig = {
  routes: [
    { domains: { main: ["example.com"] }, basePath: "store" },
    { domains: { main: ["example.com"] }, basePath: "admin" },
  ],
  mobile: {
    appName: "Example App",
    appId: "com.example.app",
    version: "1.0.0",
    buildNum: 1,
    targets: {
      store: { basePath: "store", appName: "Example Store", appId: "com.example.store" },
      admin: { basePath: "admin", appName: "Example Admin", appId: "com.example.admin" },
    },
  },
};

export default config;`}
          />
          <div className="space-y-1">
            {[
              {
                title: l.trans({ en: "CSR web surface", ko: "CSR 웹 표면" }),
                desc: l.trans({
                  en: "The app opens a Single Page Application client, not a separate native UI rewrite.",
                  ko: "앱은 별도 네이티브 UI를 다시 작성하는 것이 아니라 Single Page Application 클라이언트를 엽니다.",
                }),
              },
              {
                title: l.trans({ en: "Capacitor package", ko: "Capacitor 패키지" }),
                desc: l.trans({
                  en: "Capacitor wraps the CSR client with Android and iOS project files, app metadata, and device APIs.",
                  ko: "Capacitor는 CSR 클라이언트를 Android/iOS 프로젝트 파일, 앱 메타데이터, 디바이스 API와 함께 감쌉니다.",
                }),
              },
              {
                title: l.trans({ en: "Shared business logic", ko: "공유 비즈니스 로직" }),
                desc: l.trans({
                  en: "Web and mobile use the same Akan service, signal, document, auth, and generated client helpers.",
                  ko: "웹과 모바일은 같은 Akan service, signal, document, auth, generated client helper를 사용합니다.",
                }),
              },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-xl border border-base-300 bg-base-100 px-4 py-0">
                <span className="font-bold text-base-content">{title}: </span>
                <span className="text-base-content/70 text-sm">{desc}</span>
              </div>
            ))}
          </div>
        </Docs.Description>
      </Scroll.Slide>
      <div className="divider" />

      <Scroll.Slide id="csr-web-workflow" title={l.trans({ en: "CSR Web Workflow", ko: "CSR 웹 작업" })}>
        <Docs.Title>{l.trans({ en: "CSR Web Workflow", ko: "CSR 웹 작업" })}</Docs.Title>
        <Docs.Description>
          <div>
            {l.trans({
              en: "Akan mobile work starts as normal UI work. Build the page, component, st state, fetch calls, and dictionary text the same way you would for the web. Then test it as a CSR Single Page Application before packaging it into Android or iOS.",
              ko: "Akan 모바일 작업은 일반 UI 작업에서 시작합니다. page, component, st 상태, fetch 호출, dictionary 문구를 웹과 같은 방식으로 개발합니다. 그 다음 Android나 iOS로 패키징하기 전에 CSR Single Page Application으로 테스트합니다.",
            })}
          </div>
          <Code.Snippet
            title="Open a CSR page in the browser"
            language="bash"
            code={`http://localhost:8282/store/product/123?csr=true`}
          />
          <div>
            {l.trans({
              en: "The csr=true search parameter is useful when you want to check SPA navigation, client state, page transition, and mobile-like behavior from the browser. This is faster than opening the simulator for every small UI change.",
              ko: "csr=true search parameter는 브라우저에서 SPA 내비게이션, 클라이언트 상태, page transition, 모바일과 유사한 동작을 확인할 때 유용합니다. 작은 UI 변경마다 시뮬레이터를 여는 것보다 빠르게 확인할 수 있습니다.",
            })}
          </div>
          <Code.Snippet
            title="page/store/product/[productId].tsx"
            code={`import type { PageConfig } from "akanjs/client";

export default function Page() {
  return <div>Product detail</div>;
}

export const pageConfig = {
  safeArea: true,
  topInset: true,
  bottomInset: true,
  transition: "stack",
  cache: true,
} satisfies PageConfig;`}
          />
          <div className="space-y-1">
            {[
              {
                title: "transition",
                desc: l.trans({
                  en: "Controls how screens move. Detail pages often use stack; tab roots often use none.",
                  ko: "화면이 어떻게 이동하는지 정합니다. 상세 페이지는 보통 stack, 탭 루트는 보통 none을 사용합니다.",
                }),
              },
              {
                title: "safeArea",
                desc: l.trans({
                  en: "Prevents content from colliding with notches, home indicators, and system bars.",
                  ko: "콘텐츠가 노치, 홈 인디케이터, 시스템 바와 겹치지 않게 합니다.",
                }),
              },
              {
                title: "topInset / bottomInset",
                desc: l.trans({
                  en: "Reserves space for fixed headers, tab bars, keyboards, or bottom actions.",
                  ko: "고정 헤더, 탭바, 키보드, 하단 액션을 위한 공간을 확보합니다.",
                }),
              },
              {
                title: "cache",
                desc: l.trans({
                  en: "Keeps CSR page state when users return to list or tab screens.",
                  ko: "목록이나 탭 화면으로 돌아올 때 CSR 페이지 상태를 유지합니다.",
                }),
              },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-xl border border-base-300 bg-base-100 px-4 py-0">
                <span className="font-mono font-semibold text-primary">{title}: </span>
                <span className="text-base-content/70 text-sm">{desc}</span>
              </div>
            ))}
          </div>
          <div>
            {l.trans({
              en: "Akan CSR pages can apply mobile-style page transitions from pageConfig. Use the demos below to compare the four transition presets in a browser CSR environment before packaging the same pages into a native shell.",
              ko: "Akan CSR 페이지는 pageConfig를 통해 모바일 앱처럼 보이는 페이지 전환 효과를 적용할 수 있습니다. 아래 데모에서 4가지 transition preset을 브라우저 CSR 환경에서 비교한 뒤, 같은 페이지를 네이티브 shell로 패키징할 수 있습니다.",
            })}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "bottomup",
                src: l.trans({
                  en: "/csr/bottomup_en_trimmed.mp4",
                  ko: "/csr/bottomup_ko_trimmed.mp4",
                }),
                desc: l.trans({
                  en: "Good for modal-like flows or pages that should rise from the bottom.",
                  ko: "모달에 가까운 흐름이나 아래에서 올라오는 화면에 어울립니다.",
                }),
              },
              {
                title: "fade",
                src: l.trans({
                  en: "/csr/fade_en_trimmed.mp4",
                  ko: "/csr/fade_ko_trimmed.mp4",
                }),
                desc: l.trans({
                  en: "Keeps the movement calm when the screen context changes without hierarchy.",
                  ko: "화면 계층보다 맥락 전환이 중요한 경우 차분하게 화면을 교체합니다.",
                }),
              },
              {
                title: "scale",
                src: l.trans({
                  en: "/csr/scale_en_trimmed.mp4",
                  ko: "/csr/scale_ko_trimmed.mp4",
                }),
                desc: l.trans({
                  en: "Adds a light zoom motion for focused entry into the next page.",
                  ko: "다음 페이지로 집중해서 진입하는 느낌의 가벼운 확대 모션을 더합니다.",
                }),
              },
              {
                title: "stack",
                src: l.trans({
                  en: "/csr/stack_en_trimmed.mp4",
                  ko: "/csr/stack_ko_trimmed.mp4",
                }),
                desc: l.trans({
                  en: "Works well for detail pages that push over a list or parent screen.",
                  ko: "목록이나 상위 화면 위로 상세 화면이 쌓이는 흐름에 적합합니다.",
                }),
              },
            ].map(({ title, src, desc }) => (
              <div key={title} className="rounded-2xl border border-base-300 bg-base-100 p-3">
                <div className="mb-3">
                  <div className="font-mono font-semibold text-primary">{title}</div>
                  <div className="mt-1 text-base-content/70 text-sm leading-5">{desc}</div>
                </div>
                <div className="overflow-hidden rounded-xl border border-base-content/10 bg-base-content/5">
                  <video
                    src={src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="mx-auto aspect-9/16 max-h-[420px] w-full object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
          <Docs.Alert type="info">
            <div className="font-bold">
              {l.trans({
                en: "FAQ: Are hybrid apps worse than native apps?",
                ko: "FAQ: 하이브리드 앱이면 네이티브 앱보다 별로인가요?",
              })}
            </div>
            <div className="mt-2">
              {l.trans({
                en: "Akan improves the user experience with page transitions, safe-area handling, inset support, CSR page cache, and mobile pageConfig. Device capabilities are not blocked by the hybrid model: Capacitor plugins can bridge camera, Bluetooth, device, haptics, keyboard, safe area, and other native APIs when needed.",
                ko: "Akan은 page transition, safe-area 처리, inset 지원, CSR page cache, 모바일 pageConfig로 사용자 경험을 개선합니다. 기능 면에서도 하이브리드 모델이 제약이 되지 않습니다. 필요하면 Capacitor plugin을 통해 카메라, 블루투스, 디바이스, 햅틱, 키보드, safe area 등 네이티브 API를 사용할 수 있습니다.",
              })}
            </div>
          </Docs.Alert>
        </Docs.Description>
      </Scroll.Slide>
      <div className="divider" />

      <Scroll.Slide
        id="android-packaging"
        title={l.trans({ en: "Android Packaging Workflow", ko: "Android 패키징 작업" })}
      >
        <Docs.Title>{l.trans({ en: "Android Packaging Workflow", ko: "Android 패키징 작업" })}</Docs.Title>
        <Docs.Description>
          <div>
            {l.trans({
              en: "Use the Android flow when you want to run the CSR client in an emulator/device, verify the native Android project, or prepare Play Store artifacts. Akan prepares the Capacitor project, syncs Android, applies metadata, and builds APK or AAB outputs.",
              ko: "CSR 클라이언트를 에뮬레이터/디바이스에서 실행하거나, 네이티브 Android 프로젝트를 검증하거나, Play Store 산출물을 준비할 때 Android 흐름을 사용합니다. Akan은 Capacitor 프로젝트를 준비하고, Android를 sync하고, 메타데이터를 적용한 뒤 APK 또는 AAB 산출물을 빌드합니다.",
            })}
          </div>
          <div className="space-y-1">
            {[
              {
                title: "Run on emulator or device",
                desc: l.trans({
                  en: "Use startAndroid while developing screens and checking live reload.",
                  ko: "화면을 개발하고 live reload를 확인할 때 startAndroid를 사용합니다.",
                }),
              },
              {
                title: "Build native package",
                desc: l.trans({
                  en: "Use buildAndroid to prepare the Android project and verify the release bundle.",
                  ko: "Android 프로젝트를 준비하고 릴리즈 번들을 검증할 때 buildAndroid를 사용합니다.",
                }),
              },
              {
                title: "Release for Play Store",
                desc: l.trans({
                  en: "Use releaseAndroid with a non-local env and a store-ready assemble type such as aab.",
                  ko: "local이 아닌 env와 aab 같은 스토어 제출용 assemble type으로 releaseAndroid를 사용합니다.",
                }),
              },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-xl border border-base-300 bg-base-100 px-4 py-0">
                <span className="font-mono font-semibold text-primary">{title}: </span>

                <span className="text-base-content/70 text-sm">{desc}</span>
              </div>
            ))}
          </div>
          <Code.Snippet
            className="w-full"
            title="Android commands"
            language="bash"
            code={`akan start-android myapp --target store
akan build-android myapp --target store
akan release-android myapp --target store --env main --assembleType aab`}
          />
          <Docs.Alert type="warning">
            {l.trans({
              en: "Android release needs stable package identity and signing. Keep appId stable after release, increase buildNum for native releases, and prepare release keystore settings for Play Store artifacts.",
              ko: "Android 릴리즈에는 안정적인 패키지 식별 정보와 서명이 필요합니다. 릴리즈 후 appId는 안정적으로 유지하고, 네이티브 릴리즈마다 buildNum을 올리며, Play Store 산출물을 위한 release keystore 설정을 준비하세요.",
            })}
          </Docs.Alert>
          <Docs.Alert type="info">
            {l.trans({
              en: "For device APIs and Capacitor details, use the Capacitor documentation as the native bridge reference.",
              ko: "디바이스 API와 Capacitor 상세는 네이티브 브리지 참고 문서로 Capacitor 문서를 확인하세요.",
            })}{" "}
            <Link href="https://capacitorjs.com/docs" className="link link-primary" target="_blank" rel="noreferrer">
              {l.trans({ en: "Capacitor Docs", ko: "Capacitor 문서" })}
            </Link>
          </Docs.Alert>
        </Docs.Description>
      </Scroll.Slide>
      <div className="divider" />

      <Scroll.Slide id="ios-packaging" title={l.trans({ en: "iOS Packaging Workflow", ko: "iOS 패키징 작업" })}>
        <Docs.Title>{l.trans({ en: "iOS Packaging Workflow", ko: "iOS 패키징 작업" })}</Docs.Title>
        <Docs.Description>
          <div>
            {l.trans({
              en: "Use the iOS flow when you want to run the CSR client in the iOS simulator/device, verify the Xcode project, or prepare App Store artifacts. Akan prepares the Capacitor project, syncs iOS, applies bundle metadata, and opens or builds the native project.",
              ko: "CSR 클라이언트를 iOS 시뮬레이터/디바이스에서 실행하거나, Xcode 프로젝트를 검증하거나, App Store 산출물을 준비할 때 iOS 흐름을 사용합니다. Akan은 Capacitor 프로젝트를 준비하고, iOS를 sync하고, bundle 메타데이터를 적용한 뒤 네이티브 프로젝트를 열거나 빌드합니다.",
            })}
          </div>
          <div className="space-y-1">
            {[
              {
                title: "Run on simulator or device",
                desc: l.trans({
                  en: "Use startIos while developing screens and checking live reload.",
                  ko: "화면을 개발하고 live reload를 확인할 때 startIos를 사용합니다.",
                }),
              },
              {
                title: "Build native project",
                desc: l.trans({
                  en: "Use buildIos to prepare the iOS project, sync Capacitor, and verify the native build.",
                  ko: "iOS 프로젝트를 준비하고 Capacitor를 sync하며 네이티브 빌드를 검증할 때 buildIos를 사용합니다.",
                }),
              },
              {
                title: "Release for App Store",
                desc: l.trans({
                  en: "Use releaseIos with a non-local env, then finish signing, archive, and submission in the Apple toolchain.",
                  ko: "local이 아닌 env로 releaseIos를 사용하고, 이후 Apple 도구에서 signing, archive, submission을 마무리합니다.",
                }),
              },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-xl border border-base-300 bg-base-100 px-4 py-0">
                <span className="font-mono font-semibold text-primary">{title}: </span>
                <span className="text-base-content/70 text-sm">{desc}</span>
              </div>
            ))}
          </div>
          <Code.Snippet
            className="w-full"
            title="iOS commands"
            language="bash"
            code={`akan start-ios myapp --target store
akan build-ios myapp --target store
akan release-ios myapp --target store --env main`}
          />
          <Docs.Alert type="warning">
            {l.trans({
              en: "iOS release needs stable bundle identity and Apple signing setup. Keep appId stable after release, increase buildNum for native releases, and verify provisioning, certificates, and App Store Connect settings before submission.",
              ko: "iOS 릴리즈에는 안정적인 bundle 식별 정보와 Apple signing 설정이 필요합니다. 릴리즈 후 appId는 안정적으로 유지하고, 네이티브 릴리즈마다 buildNum을 올리며, 제출 전에 provisioning, certificate, App Store Connect 설정을 확인하세요.",
            })}
          </Docs.Alert>
        </Docs.Description>
      </Scroll.Slide>
      <div className="divider" />

      <Scroll.TitleNavigator className="fixed top-32 right-0 hidden w-[250px] flex-col gap-2 lg:flex" />
    </Scroll>
  );
}
