/**
 * 본문 **판정 사슬** — frontmatter가 아니라 마크다운 본문을 보는 체크 전부.
 *
 * - 이미지 사슬: missing-image-alt · missing-image
 * - 펜스 사슬:   unclosed-fence · unregistered-code-language
 * - 헤딩 사슬:   body-h1
 *
 * 세 사슬 모두 코드 펜스 추적(`scanBodyLines`) 위에 서 있습니다 — 펜스 규칙을
 * 검사마다 각자 구현하면 한쪽만 고쳐질 수 있어 하나로 모았습니다.
 * 심각도는 `rules.ts`의 평면 테이블에서 읽습니다.
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { isPostFile } from '../../post/index.ts';
import { decodeUrlSafe } from '../../shared/url.ts';
// fence 라벨 허용 목록은 설정(registries.supportedFenceLabels)에서 파라미터로
// 온다 — 진입점(validate-posts)이 컨텍스트의 값을 넘기고, 기본값은 설정
// 기본값과 같은 상수(prismLanguages.ts)다.
import { SUPPORTED_FENCE_LABELS } from '../../shared/prismLanguages.ts';
import { frontmatterOffset } from './shared.ts';
import type { Issue, PostRecord, ValidateContext } from './shared.ts';
import { resolveSeverity } from './rules.ts';

/** 마크다운 `![alt](src)` — alt는 비어 있을 수 있다. */
const MARKDOWN_IMAGE = /!\[([^\]]*)]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/** 개행은 남기고 나머지만 공백으로 — 줄 번호 계산이 어긋나지 않도록. */
function blank(text: string): string {
  return text.replace(/[^\n]/g, ' ');
}

/**
 * 코드 펜스 안을 **길이를 유지한 채** 공백으로 덮은 본문을 만듭니다.
 *
 * 펜스 안의 이미지 문법이나 `# 주석`은 코드 **예시**입니다 — 실제로 이 저장소의
 * 글에 펜스 안 `# ` 줄이 32개 있습니다(쉘·yaml 주석).
 *
 * **덮는 곳은 펜스뿐입니다.** 인라인 코드와 HTML 주석도 덮어 봤지만, 둘 다
 * 여는 표시와 닫는 표시를 문서에서 짝지어야 해서 짝이 하나만 어긋나면 멀쩡한
 * 산문을 통째로 덮었고, 그 안의 깨진 이미지와 진짜 h1이 **조용히 사라졌습니다**.
 * 검사기가 스스로 검사를 끄는 실패라, 오탐보다 나쁩니다.
 * 코퍼스로도 확인했습니다 — 인라인 코드로 `<img>`·`<h1>`을 인용한 글은 0건인데
 * `<!--`와 `-->`가 산문에서 짝이 안 맞는 글은 3건입니다. 막으려던 문제보다
 * 부작용이 흔합니다. 펜스는 여닫이가 줄 단위로 명확해 같은 함정이 없습니다.
 *
 * 길이(와 줄 수)를 유지하는 건 match.index로 줄 번호를 그대로 계산하기 위해서입니다.
 */
export function maskNonProse(content: string): string {
  return scanBodyLines(content)
    .lines.map(({ text, inFence }) => (inFence ? blank(text) : text))
    .join('\n');
}

export function validateImageReferences(
  record: PostRecord,
  raw: string,
  options: ValidateContext,
): Issue[] {
  const { absPath, relPath } = record;
  const issues: Issue[] = [];
  const offset = frontmatterOffset(raw);
  const prose = maskNonProse(record.content);
  const lineOf = (index: number) =>
    offset + prose.slice(0, index).split('\n').length;

  // **마크다운 이미지만** 검사한다. raw HTML `<img>`의 alt는 `check-seo`가
  // 최종 HTML에서 보고, 그 검사는 이제 `pnpm build`의 마지막 단계라 로컬에서도
  // 돈다 — 여기서 또 볼 이유가 없다.
  //
  // 여기서 raw HTML까지 훑어봤더니 산문에 인용한 `<img …>` 태그가 그대로
  // 위반으로 잡혔다. 렌더되면 `<code>` 텍스트라 실제 페이지에는 이미지가 없는데도
  // 엄격 모드에서 빌드를 막는, 글쓴이가 납득할 수 없는 실패다. 정작 alt 없는
  // raw `<img>`는 이 저장소 50개 글에 **0건**이다.
  // MARKDOWN_IMAGE의 두 캡처 그룹은 매치에 항상 참여합니다(1번은 빈 문자열 가능).
  const found = [...prose.matchAll(MARKDOWN_IMAGE)].map(m => ({
    alt: m[1] ?? '',
    ref: m[2] ?? '',
    index: m.index,
  }));

  for (const { alt, ref, index } of found) {
    // alt가 비면 스크린리더는 파일 URL을 읽거나 그냥 건너뛴다. 이미지가 다이어그램인
    // 이 블로그에서는 그림이 설명의 본체인 경우가 많아서 내용이 통째로 사라진다.
    //
    // 빌드에서 제외되는 메타 노트는 렌더될 일이 없으므로 검사하지 않는다 —
    // validatePost·validateBodyHeadings와 같은 기준(isPostFile).
    if (alt.trim() === '' && isPostFile(record.data)) {
      issues.push({
        file: relPath,
        line: lineOf(index),
        severity: resolveSeverity('missing-image-alt', record.data, options),
        rule: 'missing-image-alt',
        message: `이미지에 alt 텍스트가 없습니다 — 스크린리더가 읽을 설명을 적어주세요: ${ref}`,
      });
    }

    if (
      /^https?:\/\//.test(ref) ||
      ref.startsWith('/') ||
      ref.startsWith('data:')
    ) {
      continue;
    }

    // split은 빈 배열을 만들지 않으므로 [0]은 항상 존재한다 — 기본값은 타입을
    // 좁히기 위한 것이고, 실제로는 쓰이지 않는다.
    const [beforeHash = ref] = ref.split('#');
    const [beforeQuery = beforeHash] = beforeHash.split('?');
    const cleanRef = decodeUrlSafe(beforeQuery);
    const resolved = resolve(dirname(absPath), cleanRef);
    if (!existsSync(resolved)) {
      issues.push({
        file: relPath,
        line: lineOf(index),
        severity: resolveSeverity('missing-image', record.data, options),
        rule: 'missing-image',
        message: `이미지 파일을 찾을 수 없습니다: ${cleanRef}`,
      });
    }
  }
  return issues;
}

export interface ScannedLine {
  text: string;
  /** 본문 기준 0-based 줄 번호 */
  index: number;
  /** 코드 펜스 안(여는·닫는 펜스 줄 포함)이면 true */
  inFence: boolean;
  /**
   * 이 줄이 펜스를 **여는** 줄이면 info string, 아니면 `null`.
   *
   * 라벨 없는 펜스(``` 만 있는 줄)는 빈 문자열 `''`입니다 — "여는 줄이 아니다"
   * (`null`)와 "열지만 언어 라벨이 없다"(`''`)는 다른 상태라 구분합니다.
   * 여는 줄인지만 볼 때는 `!== null`로, 라벨이 있는지까지 볼 때는 truthy로 봅니다.
   */
  opensFence: string | null;
}

/**
 * 본문을 줄 단위로 훑으면서 각 줄이 코드 펜스 안인지 표시합니다.
 *
 * 마크다운을 다루는 글이 코드 예시로 펜스를 품는 경우가 흔해서, 여는 펜스의
 * **문자(백틱/틸데)와 개수**를 함께 기억했다가 같은 문자·같은 개수 이상의
 * 라벨 없는 펜스로 닫힐 때까지는 안쪽을 본문으로 보지 않습니다(CommonMark 규칙).
 *
 * 개수만 보고 문자를 무시하면 ```로 연 펜스가 안쪽 `~~~`로 닫힌 것처럼 보여,
 * 그 뒤의 코드 줄들이 본문으로 새어 나옵니다 — `# 주석` 한 줄이 고칠 수 없는
 * body-h1 경고가 되는 식입니다.
 *
 * 펜스 규칙을 두 검사(코드 라벨·본문 h1)가 각자 구현하면 한쪽만 고쳐질 수 있어
 * 하나로 모았습니다.
 */
export interface ScanResult {
  lines: ScannedLine[];
  /**
   * **끝까지 닫히지 않은** 펜스가 열린 줄 인덱스(없으면 null).
   *
   * 예전엔 모듈 변수에 담아 호출 뒤에 이어 읽었는데, `maskNonProse`도 같은
   * 스캐너를 호출해 그 값을 덮어씁니다. 두 검사 사이에 마스킹이 한 번만 끼어도
   * `unclosed-fence` 경고가 엉뚱한 줄을 가리키거나 사라지고, 그게 호출 순서에만
   * 의존해 맞는 상태였습니다. 반환값에 실어 그 결합을 없앱니다.
   */
  unclosedFenceAt: number | null;
}

export function scanBodyLines(content: string): ScanResult {
  const result: ScannedLine[] = [];
  let fenceChar = '';
  let fenceLength = 0;
  // 열려 있는 펜스가 차지한 줄 인덱스. 끝까지 안 닫히면 되돌린다.
  let openedAt: number[] = [];

  content.split('\n').forEach((text, index) => {
    // `[^\n]*`로 받는다: CRLF 파일에서 줄 끝의 `\r`을 `.`이 먹지 못해
    // 펜스가 하나도 인식되지 않고, 그러면 아무것도 마스킹되지 않는다.
    const m = text.match(/^(\s{0,3})(`{3,}|~{3,})([^\n]*)$/);
    if (!m) {
      result.push({
        text,
        index,
        inFence: fenceLength > 0,
        opensFence: null,
      });
      if (fenceLength > 0) openedAt.push(index);
      return;
    }

    // 2·3번 캡처 그룹은 매치에 항상 참여합니다(3번은 빈 문자열 가능).
    const marker = m[2] ?? '';
    const rest = m[3] ?? '';
    const char = marker.charAt(0);
    const length = marker.length;
    const info = rest.trim();

    if (fenceLength > 0) {
      if (char === fenceChar && length >= fenceLength && info === '') {
        fenceChar = '';
        fenceLength = 0;
        openedAt = [];
      }
      result.push({ text, index, inFence: true, opensFence: null });
      if (fenceLength > 0) openedAt.push(index);
      return;
    }

    fenceChar = char;
    fenceLength = length;
    openedAt = [index];
    result.push({ text, index, inFence: true, opensFence: info });
  });

  // 끝까지 닫히지 않은 펜스는 **펜스가 아니었던 것으로** 되돌린다.
  //
  // 열린 채로 두면 오타 하나(닫는 ```를 빠뜨렸거나, 산문에 `~~~~ 구분선`을 쓴 것)
  // 때문에 그 아래 본문 전체가 코드로 취급되어 이미지·헤딩 검사가 통째로 멈춘다.
  // 검사기가 조용히 검사를 끄는 것보다, 코드 블록 안을 한 번 더 보는 편이 낫다.
  for (const index of openedAt) {
    // 펜스가 아니었으므로 언어 라벨도 아니다. 안 닫힌 펜스 자체는
    // validateCodeFenceLanguages가 `unclosed-fence`로 따로 알린다 — 라벨 오타보다
    // "펜스가 안 닫혔다"가 더 큰 문제이고, 산문의 `~~~~ 구분선`을 언어 이름으로
    // 보고하는 모순도 사라진다.
    // openedAt의 인덱스는 전부 위 forEach에서 result에 push된 줄이다.
    const opened = result[index];
    if (opened) {
      result[index] = { ...opened, inFence: false, opensFence: null };
    }
  }

  return {
    lines: result,
    unclosedFenceAt: openedAt[0] ?? null,
  };
}

/**
 * 코드 펜스의 언어 라벨이 CodeBlock에 등록된 언어인지 검사합니다.
 *
 * CodeBlock은 refractor 전 언어를 번들하는 대신 `prismLanguages.ts`에 적힌
 * 언어만 등록합니다(번들 gzip 350KB 절감). 등록되지 않은 라벨은 에러 없이
 * 그냥 강조 없는 평문으로 렌더되기 때문에, 글쓴이가 알아채기 어렵습니다.
 * 그 조용한 품질 저하를 빌드 시점 경고로 끌어올립니다.
 */
export function validateCodeFenceLanguages(
  record: PostRecord,
  raw: string,
  supportedFenceLabels: ReadonlySet<string> = SUPPORTED_FENCE_LABELS,
): Issue[] {
  const issues: Issue[] = [];
  const offset = frontmatterOffset(raw);

  const { lines: scanned, unclosedFenceAt } = scanBodyLines(record.content);
  if (unclosedFenceAt !== null) {
    issues.push({
      file: record.relPath,
      line: offset + unclosedFenceAt + 1,
      // 고정 'warning' 규칙이라 설정을 넘기지 않는다 — SEO_PUBLISH로 바꾸려면 여기까지 배선할 것
      severity: resolveSeverity('unclosed-fence', record.data),
      rule: 'unclosed-fence',
      message:
        '코드 펜스가 끝까지 닫히지 않았습니다 — 닫는 펜스를 넣거나, 구분선이라면 `---`를 쓰세요. (닫히지 않은 펜스는 코드 블록으로 보지 않습니다)',
    });
  }

  for (const { index, opensFence } of scanned) {
    if (!opensFence) continue;

    // ```ts title="a.ts" 처럼 뒤에 메타가 붙는 경우 첫 토큰만 언어다.
    // split은 빈 배열을 만들지 않으므로 [0]은 항상 존재한다.
    const [firstToken = ''] = opensFence.split(/[\s,{]/);
    const label = firstToken.toLowerCase();
    if (!label || supportedFenceLabels.has(label)) continue;

    issues.push({
      file: record.relPath,
      line: offset + index + 1,
      // 고정 'warning' 규칙이라 설정을 넘기지 않는다 — SEO_PUBLISH로 바꾸려면 여기까지 배선할 것
      severity: resolveSeverity('unregistered-code-language', record.data),
      rule: 'unregistered-code-language',
      message: `구문 강조에 등록되지 않은 언어입니다: \`${label}\` — 강조 없이 평문으로 렌더됩니다. @blog/content의 src/shared/prismLanguages.ts에 추가하거나 평문 라벨(text)을 쓰세요.`,
    });
  }

  return issues;
}

/** setext h1 밑줄 (`===`). h2 밑줄(`---`)은 여기서 볼 일이 없다. */
const SETEXT_H1_RULE = /^ {0,3}=+\s*$/;

/**
 * 그 줄에서 시작하고 **그 줄로 끝나는** 블록 — ATX 헤딩, 구분선(`---`/`***`/`___`).
 * 뒤 줄은 다시 자유롭게 문단을 열 수 있다.
 */
const LEAF_BLOCK_START = /^ {0,3}(?:#{1,6}(?: |$)|(?:-{3,}|\*{3,}|_{3,})\s*$)/;

/**
 * 그 줄에서 시작해 **뒤 줄들을 계속 삼키는** 블록 — 목록·인용·표·raw HTML.
 * 빈 줄을 만날 때까지 이어지는 줄들은 전부 이 블록의 내용이다.
 */
const CONTAINER_BLOCK_START = /^ {0,3}(?:[-*+](?:\s|$)|\d+[.)](?:\s|$)|[>|]|<)/;

/**
 * 각 줄이 **setext 밑줄로 헤딩이 될 수 있는 최상위 문단**인지 표시합니다.
 *
 * 한 줄만 보고 판정하면 안 됩니다. `===` 앞 줄이 산문처럼 생겼어도, 그게 목록
 * 항목의 이어지는 줄이면 CommonMark는 헤딩으로 읽지 않습니다(setext 밑줄은
 * 목록 항목의 lazy continuation이 될 수 없습니다):
 *
 * ```md
 * - 항목
 *   이어지는 줄
 * ===
 * ```
 *
 * 예전 구현은 `이어지는 줄`이 목록 마커로 시작하지 않는다는 이유로 문단으로 보고
 * body-h1 경고를 냈는데, 렌더 결과에는 h1이 없으니 **글쓴이가 고칠 수 없는**
 * 경고였습니다. 구분선 뒤의 `---\n===`도 같은 이유로 잘못 걸렸습니다.
 *
 * 그래서 블록 상태를 이어가며 훑습니다: 빈 줄은 모든 블록을 닫고, 컨테이너
 * 블록은 빈 줄까지 뒤 줄을 삼키고, leaf 블록은 그 줄에서 끝납니다.
 */
export function markParagraphLines(lines: string[]): boolean[] {
  const isParagraph: boolean[] = [];
  // 빈 줄 전까지 뒤 줄을 삼키는 블록(목록·인용·표·raw HTML·들여쓴 코드) 안인가.
  let inContainer = false;
  let inParagraph = false;

  for (const text of lines) {
    if (text.trim() === '') {
      inContainer = false;
      inParagraph = false;
      isParagraph.push(false);
      continue;
    }
    if (LEAF_BLOCK_START.test(text)) {
      inContainer = false;
      inParagraph = false;
      // setext 밑줄은 앞 문단을 **헤딩으로 소비한다**. 여기서 닫지 않으면
      // `제목\n===\n===`의 둘째 `===`가 또 문단으로 보여 경고가 두 번 난다.
    } else if (inParagraph && SETEXT_H1_RULE.test(text)) {
      inParagraph = false;
    } else if (CONTAINER_BLOCK_START.test(text)) {
      inContainer = true;
      inParagraph = false;
      // 들여쓴 코드 블록(공백 4칸)은 문단 **안**에서는 그냥 이어지는 줄이지만,
      // 문단 밖에서 시작하면 빈 줄까지 이어지는 코드다.
    } else if (!inParagraph && /^ {4,}/.test(text)) {
      inContainer = true;
    } else if (!inContainer) {
      inParagraph = true;
    }
    isParagraph.push(inParagraph);
  }

  return isParagraph;
}

/**
 * 본문에 `# ` 헤딩(h1)이 있는지 검사합니다.
 *
 * 페이지의 h1은 글 제목 하나뿐이어야 하는데, 예전 글들은 본문 첫 줄에 제목을
 * 한 번 더 적거나 절 제목을 `#`으로 시작해서 렌더된 HTML에 h1이 2~4개 있었습니다.
 * 렌더 계층이 h1을 h2로 강등해 페이지 자체는 이제 항상 h1 하나지만
 * (src/components/post/markdownHeadings.tsx), 그 조용한 교정 때문에 글쓴이는
 * 원문이 틀렸다는 걸 영영 모릅니다. `hero`와 같은 방식으로 그 침묵을 깹니다.
 *
 * 검사는 `maskNonProse`를 지난 본문에서 합니다 — 코드 펜스 안의 `# 주석`은
 * 헤딩이 아니라 코드 예시라, 그대로 검사하면 손댈 수 없는 경고가 나옵니다.
 *
 * 마크다운 문법(ATX·setext)만 봅니다. raw HTML `<h1>`은 보지 않습니다 —
 * 렌더된 h1 개수는 `check-seo`가 최종 HTML에서 세고(그 검사는 `pnpm build`의
 * 마지막 단계라 로컬에서도 돕니다), 여기서 태그를 찾으면 산문에 인용한
 * `` `<h1>` `` 까지 잡혀 고칠 수 없는 경고가 됩니다(이미지 검사와 같은 판단).
 *
 * 빌드에서 제외되는 메타 노트(유효한 `status` 없음)는 렌더될 일이 없으므로
 * 검사하지 않습니다 — 기획 문서의 `# 제목`까지 잡으면 경고만 늘고 고칠 것이 없습니다.
 */
export function validateBodyHeadings(record: PostRecord, raw: string): Issue[] {
  if (!isPostFile(record.data)) return [];

  const issues: Issue[] = [];
  const offset = frontmatterOffset(raw);

  // 마스킹된 본문은 줄 수와 각 줄의 길이가 원본과 같으므로 줄 번호가 그대로다.
  // 펜스 안은 이미 공백으로 덮여 있어 따로 inFence를 볼 필요가 없다.
  const lines = maskNonProse(record.content).split('\n');
  // 메시지에 인용할 줄은 **원문**이다. 마스킹된 줄을 그대로 보여주면
  // ``# `useEffect` `` 가 `: #` 로만 찍혀 어디를 고칠지 알 수 없다.
  // (마스킹은 길이와 줄 수를 유지하므로 인덱스가 그대로 맞는다)
  const originalLines = record.content.split('\n');
  const paragraphLines = markParagraphLines(lines);

  for (const [index, text] of lines.entries()) {
    // ATX(`# 제목`)와 setext(`제목` 다음 줄에 `===`) 둘 다 h1로 렌더된다.
    // ATX만 보면 setext h1은 조용히 강등되고 경고도 안 나와, 이 규칙이 존재하는
    // 이유(조용한 교정을 드러내기)가 그대로 무너진다.
    //
    // ATX는 앞 공백 3칸까지 허용된다(CommonMark). `/^# /`로만 보면 들여쓴 h1이
    // 그대로 렌더되는데 lint는 조용하다.
    const isAtx = /^ {0,3}# /.test(text);
    // setext 밑줄은 **최상위 문단** 뒤에만 붙는다 — 판정은 markParagraphLines가
    // 블록 상태를 이어가며 한다.
    const next = lines[index + 1];
    const isSetext =
      paragraphLines[index] && next !== undefined && SETEXT_H1_RULE.test(next);
    if (!isAtx && !isSetext) continue;

    issues.push({
      file: record.relPath,
      line: offset + index + 1,
      // 고정 'warning' 규칙이라 설정을 넘기지 않는다 — SEO_PUBLISH로 바꾸려면 여기까지 배선할 것
      severity: resolveSeverity('body-h1', record.data),
      rule: 'body-h1',
      message: `본문에 h1(${isAtx ? '`# `' : '밑줄 `===`'})이 있습니다 — 페이지의 h1은 글 제목 하나뿐이어야 합니다. 제목의 중복이면 줄을 지우고, 절 제목이면 \`## \`로 내리세요. (렌더 시에는 h2로 강등되지만 원문은 그대로입니다): ${(originalLines[index] ?? text).trim()}`,
    });
  }

  return issues;
}
