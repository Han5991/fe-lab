/**
 * 코드 블록 구문 강조에 등록하는 Prism 언어 목록 — **단일 출처**.
 *
 * `react-syntax-highlighter`의 `Prism` export는 refractor의 전 언어(300여 종)를
 * 통째로 번들해 gzip 350KB짜리 청크가 된다. 이 블로그가 실제로 쓰는 fence
 * 언어는 십여 종이라 `PrismLight` + 필요한 언어만 등록으로 바꿨다.
 *
 * 이 파일은 **데이터만** 둔다. `validate-posts.ts`(tsx로 도는 Node 스크립트)가
 * 같은 목록을 읽어 등록되지 않은 fence 언어를 빌드 시점에 잡아내야 하는데,
 * 여기서 react-syntax-highlighter를 import하면 그 스크립트까지 무거워진다.
 * 실제 언어 모듈 import와 등록은 CodeBlock.tsx가 하고, 두 곳의 키가 어긋나지
 * 않는지는 CodeBlock.test.ts가 검증한다.
 */

/**
 * 등록할 언어 → refractor가 함께 받아주는 별칭.
 *
 * **선언 순서가 곧 등록 순서이고, 순서가 결과를 바꾼다.** refractor 5의 언어
 * 모듈은 의존성을 스스로 등록하므로(tsx → jsx + typescript) 보통은 순서를
 * 신경 쓸 필요가 없지만, 문법을 *덧입히는* 확장은 예외다. `typescript`는
 * `javascript` 문법을 복제해서 만들어지므로, javascript를 패치하는
 * js-extras·jsdoc이 typescript보다 **먼저** 등록돼야 그 결과가 typescript/tsx
 * 코드 블록에도 실린다.
 */
export const PRISM_LANGUAGES = {
  markup: ['html', 'xml', 'svg'],
  css: [],
  javascript: ['js'],
  jsx: [],
  // fence 라벨이 아니라 javascript 문법 확장. 전체 Prism 번들에는 딸려 오던
  // 것이라 PrismLight로 바꾸며 한 번 빠뜨렸는데, 스크린샷을 픽셀 비교해 보니
  // `Promise` / `NonNullable` / `FileHandle` 같은 타입 이름이 청록색을 잃었다
  // (known-class-name 토큰이 사라져서). 시각적으로 유의미하므로 반드시 유지.
  'js-extras': [],
  jsdoc: [],
  typescript: ['ts'],
  tsx: [],
  bash: ['sh', 'shell'],
  yaml: ['yml'],
  json: [],
  diff: [],
  markdown: ['md'],
  docker: ['dockerfile'],
} as const satisfies Record<string, readonly string[]>;

export type PrismLanguageName = keyof typeof PRISM_LANGUAGES;

/**
 * 구문 강조 없이 평문으로 렌더해도 되는 fence 라벨. Prism 언어가 아니지만
 * 의도적으로 쓰는 것들이라 lint가 경고하지 않도록 허용 목록에 둔다.
 */
export const PLAIN_FENCE_LABELS = [
  'text',
  'txt',
  'plaintext',
  'console',
  'aiignore',
  'gitignore',
] as const;

/** CodeBlock이 별도 렌더러로 처리하는 fence. */
const SPECIAL_FENCE_LABELS = ['mermaid'] as const;

/**
 * 문법 확장 전용 — 등록은 하지만 fence 라벨로 쓰지는 않는다.
 * (글에 ```js-extras 라고 쓸 일은 없다)
 *
 * CodeBlock이 이 목록을 보고 **중복 등록 방지 래퍼**를 씌운다. 이 둘은 언어가
 * 아니라 javascript 문법을 덧씌우는 패치라 자기 이름의 언어 키를 만들지 않고,
 * refractor의 중복 가드가 하필 그 키로 판단해 매번 통과해버린다 — 자세한 사정은
 * CodeBlock.tsx의 `registerOnce` 주석 참고.
 */
export const GRAMMAR_EXTENSION_ONLY: ReadonlySet<string> = new Set([
  'js-extras',
  'jsdoc',
]);

/** fence 라벨로 허용되는 값 전체 (등록 언어 + 별칭 + 평문 + 특수). */
export const SUPPORTED_FENCE_LABELS: ReadonlySet<string> = new Set<string>([
  ...Object.keys(PRISM_LANGUAGES).filter(n => !GRAMMAR_EXTENSION_ONLY.has(n)),
  ...Object.values(PRISM_LANGUAGES).flat(),
  ...PLAIN_FENCE_LABELS,
  ...SPECIAL_FENCE_LABELS,
]);
