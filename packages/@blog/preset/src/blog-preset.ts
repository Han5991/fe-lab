// 런타임에 실행되는 파일(content.config.mts가 themeColor를 부른다)이라 가벼운 define 진입점을
// 쓴다(Panda v2 design-systems/publishing).
import { definePreset, defineSemanticTokens } from '@pandacss/dev/define';

/** 라이트(`base`)·다크(`_dark`) 한 쌍 — 시맨틱 토큰 값의 모양 그대로다. */
interface ThemePair<T> {
  readonly base: T;
  readonly _dark: T;
}

/**
 * 여러 토큰이 같은 값을 쓰는 색은 상수로 한 번만 적는다. `ink.950`과 `accent.solid`처럼
 * 이름이 둘인 자리가 각자 hex를 들면 한쪽만 바뀐다 — 토큰은 이 상수를 가리킨다.
 * Panda 참조 문법(`{colors.ink.950}`)을 쓰지 않는 이유는 `themeColor`가 `.value`를 그대로
 * 돌려주기 때문이다(참조 문자열이 렌더러에 그대로 넘어간다).
 */
const PAPER_50 = { base: '#ffffff', _dark: '#0b0d10' } as const;
const INK_950 = { base: '#1a1a1a', _dark: '#e6e8eb' } as const;
const INK_800 = { base: '#3a3d42', _dark: '#c2c7ce' } as const;

/** `#rrggbb` → [r, g, b]. 입력은 이 파일의 리터럴뿐이라, 모양이 틀리면 로드 시점에 던진다. */
function rgbOf(hex: string): readonly [number, number, number] {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(`#rrggbb 형태가 아니다: ${hex}`);
  }
  const channel = (at: number) => parseInt(hex.slice(at, at + 2), 16);
  return [channel(1), channel(3), channel(5)];
}

/** 불투명 색에 알파를 준다 — `rgba(r,g,b,a)`로 낸다. */
function rgba(hex: string, opacity: number): string {
  return `rgba(${rgbOf(hex).join(',')},${opacity})`;
}

/** 테마마다 다른 알파를 준다. */
function alpha(color: ThemePair<string>, opacity: ThemePair<number>) {
  return {
    base: rgba(color.base, opacity.base),
    _dark: rgba(color._dark, opacity._dark),
  };
}

/**
 * 색을 지면 위에 `amount`만큼 올린 **불투명** 결과 — `#rrggbb`로 낸다. 알파 색은 놓이는 표면마다
 * 결과가 달라지므로, 표면이 바뀌어도 같아야 하는 자리(드래그 선택)는 미리 합성한다.
 */
function mix(
  color: ThemePair<string>,
  amount: ThemePair<number>,
  ground: ThemePair<string>,
) {
  const over = (fg: string, a: number, bg: string) => {
    const [fr, fgr, fb] = rgbOf(fg);
    const [br, bgr, bb] = rgbOf(bg);
    const channel = (f: number, b: number) =>
      Math.round(b + (f - b) * a)
        .toString(16)
        .padStart(2, '0');
    return `#${channel(fr, br)}${channel(fgr, bgr)}${channel(fb, bb)}`;
  };
  return {
    base: over(color.base, amount.base, ground.base),
    _dark: over(color._dark, amount._dark, ground._dark),
  };
}

/**
 * 테마-가변 색 팔레트 — 아래 `blogPreset`의 `semanticTokens.colors`가 그대로 쓴다.
 *
 * 프리셋 안에 인라인으로 두지 않고 이름을 준 이유: **CSS 변수를 못 읽는 렌더러**가
 * 같은 값을 읽어야 하기 때문이다(`themeColor` 참고). 예전에는 그런 소비처가 hex를
 * 손으로 옮겨 적었다.
 *
 * `defineSemanticTokens.colors`로 감싼 이유는 둘이다. Panda의 시맨틱 토큰 계약을
 * **여기서** 검증받고(조건 키 오타·잘못된 값 모양이 이 파일에서 잡힌다), 그러면서도
 * 리터럴 타입을 잃지 않는다 — 이 헬퍼는 `<Value>(definition) => Value` 제네릭이라
 * 키가 좁혀진 채로 나온다. `themeColor`의 이름 검사가 그 위에 선다.
 */
const blogColors = defineSemanticTokens.colors({
  // ─────────────────────────────────────────────────────────────
  // 테마-가변 팔레트 — 무채색이고, 따로 고른 포인트색은 없다(accent.*는 잉크에서
  // 파생한다 ↓). 다크 조건은 panda.config의 conditions.dark = [data-theme=dark] &.
  //
  // 값의 출처는 리뉴얼 디자인 시안이고, 이 표가 그 대응을 그대로 옮긴
  // **단일 출처**다(시안 파일은 구현 후 삭제됐다).
  //
  //   시안 변수 → 토큰
  //   --bg      #FFFFFF / #0B0D10  → paper.50
  //   --bg-sub  #F7F7F5 / #14171C  → paper.100
  //   --page    #EDEDEA / #060809  → paper.200 (다크는 일부러 다름 ↓)
  //   --fg      #1A1A1A / #E6E8EB  → ink.950
  //   --fg-sub  #6B7280 / #8B919A  → ink.600
  //   --accent  (폐기 — accent.*는 --fg에서 파생한다. accent.* 항목 주석 참고)
  //   --border  rgba(0,0,0,.10) / rgba(255,255,255,.12) → ink.border
  //
  // `paper.200` 다크만 시안(`#060809`)을 따르지 않고 `#1B1F26`을 쓴다.
  // 시안의 `--page`는 목업 카드 **뒤쪽 바깥 배경**이라 다크에서 `--bg`
  // 보다 더 어둡다. 실제 사이트에는 그 바깥 배경이 없고, `paper.200`이
  // 맡은 역할은 인라인 코드·콜아웃처럼 지면에서 **한 단계 떠 있는**
  // 서피스라 오히려 `--bg`보다 밝아야 한다. 시안 값을 그대로 쓰면
  // 코드 배경이 본문보다 어두워져 파여 보인다.
  //
  // 토큰 이름(paper/ink/moss)은 기존 컴포넌트가 그대로 소비하므로 유지하고
  // 값만 갈아끼운다.
  // ─────────────────────────────────────────────────────────────
  // paper — 서피스
  'paper.50': { value: PAPER_50 },
  'paper.100': { value: { base: '#f7f7f5', _dark: '#14171c' } },
  'paper.200': { value: { base: '#ededea', _dark: '#1b1f26' } },
  'paper.300': { value: { base: '#e0e0dc', _dark: '#242931' } },
  // ink — 텍스트/보더
  'ink.950': { value: INK_950 },
  'ink.900': { value: { base: '#262626', _dark: '#d5d9de' } },
  'ink.800': { value: INK_800 },
  'ink.700': { value: { base: '#4b5563', _dark: '#a5acb5' } },
  // 레퍼런스 --fg-sub. paper.50 위 4.77:1로 AA 통과.
  'ink.600': { value: { base: '#6b7280', _dark: '#8b919a' } },
  // ink.500 — 12px 메타 텍스트(날짜/읽기시간/태그)용. --fg-sub를 그대로
  // 쓰면 paper.100(#F7F7F5) 위에서 4.45:1로 AA(4.5:1)를 아슬하게
  // 놓친다. 서브 서피스 위에서도 4.8:1이 나오도록 한 톤만 내렸다
  // (육안 차이는 거의 없다). 다크는 5.7:1이라 --fg-sub 그대로.
  'ink.500': { value: { base: '#656c77', _dark: '#8b919a' } },
  'ink.400': { value: { base: '#9096a0', _dark: '#6d737c' } },
  'ink.300': { value: { base: '#b8bcc4', _dark: '#525860' } },
  'ink.200': { value: { base: '#d8d8d4', _dark: '#333941' } },
  'ink.100': { value: { base: '#ededea', _dark: '#242931' } },
  'ink.50': { value: { base: '#f7f7f5', _dark: '#1b1f26' } },
  'ink.25': { value: { base: '#f7f7f5', _dark: '#14171c' } },
  // 레퍼런스 --border. 0.5~1px hairline 용도.
  'ink.border': {
    value: {
      base: 'rgba(0,0,0,0.10)',
      _dark: 'rgba(255,255,255,0.12)',
    },
  },
  'ink.borderStrong': {
    value: {
      base: 'rgba(0,0,0,0.22)',
      _dark: 'rgba(255,255,255,0.26)',
    },
  },
  // accent — **따로 고른 포인트색이 아니다.** 본문 잉크·지면과 같은 상수에서 파생한다.
  // 값을 옮겨 온 Astryx docsite 테마(MIT)가 accent 토큰 전부를 그 테마의 primary 텍스트
  // 잉크로 돌리는 구조를 따랐다 — 잉크 값은 Astryx의 PRIMARY가 아니라 이 팔레트의 ink.950이다.
  // 링크·현재 위치가 본문과 색으로 갈리지 않으므로 밑줄·굵기·틴트로 가른다(blog-design-system
  // 스킬). 대비는 라이트 / 다크.
  //   solid      = ink.950. 링크·현재 위치 표식·주 버튼 면·다이어그램 핵심 경로.
  //                paper.50 위 17.40 / 15.85.
  //   muted      = ink.950 8% / 14%. 틴트 — 배지·선택 행·검색어·tip 콜아웃·다이어그램 노드.
  //                paper.50 위 합성 #ededed / #2a2c2f, 그 위 solid 14.87 / 11.41.
  //                보조 글자(ink.500)는 다크에서 4.41로 AA를 놓쳐 ink.700 이상을 쓴다(6.46 / 6.11).
  //   onSolid    = paper.50. solid 면 위 글자 17.40 / 15.85 — 다크 solid가 밝은 잉크라 흰 글자는
  //                1.23이다.
  //   solidHover = ink.800. 주 버튼 hover 면. Astryx는 그라데이션 hover 레이어를 얹지만
  //                그라데이션은 금지(AGENTS.md §9)라 면 색을 바꾼다. onSolid 대비 10.90 / 11.45.
  // 2026-10까지는 cyan(#0891B2 / #67E8F9)을 용도별 여섯 단계(50·200·500·600·700·900)로 썼다.
  // cyan은 OG 카드 렌더용 상수(아래 ogBrand)로만 남았다.
  'accent.solid': { value: INK_950 },
  'accent.muted': {
    value: alpha(INK_950, { base: 0.08, _dark: 0.14 }),
  },
  'accent.onSolid': { value: PAPER_50 },
  'accent.solidHover': { value: INK_800 },
  // selection — 드래그 선택(::selection)과 문장 공유 링크 강조(::target-text)의 배경.
  // 예전엔 ink.border(알파 10%)를 그대로 썼는데, 알파 색이라 흰 지면에서 1.25:1까지
  // 묽어져 "선택했다"가 눈에 안 들어왔다. 여기 값은 잉크를 지면에 미리 합성한
  // **불투명** 색이다 — 알파를 쓰면 표면이 다른 자리에서 결과 색을 예측할 수 없다.
  //   base  = ink.950 18% on paper.50 → #d6d6d6
  //   _dark = ink.950 22% on paper.50 → #3b3d40
  // 지면 대비 1.45 / 1.79로 브라우저 기본 선택색(#B4D5FE, 1.51:1)과 비슷하고, cyan을 합성하던
  // 때(1.44 / 1.80)의 세기를 그대로 잇는다. 본문 글자(ink.900)는 이 위에서 10.41 / 7.68.
  'selection.bg': {
    value: mix(INK_950, { base: 0.18, _dark: 0.22 }, PAPER_50),
  },
  // moss — success 그린. 레퍼런스 --success (#16A34A / #97C459).
  // 포인트색이 잉크가 되면서 accent와 색상각이 겹칠 일은 없어졌지만, 노랑기
  // 있는 그린이라는 성격은 그대로 둔다(경고색과도 구분돼야 한다).
  'moss.600': { value: { base: '#16a34a', _dark: '#97c459' } },
  // moss.700 — 옅은 초록 배경 위 텍스트 전용. 라이트에서 moss.600은
  // 흰 배경 위 3.30:1, 초록 12% 배경 위 2.9:1로 AA 미달이다.
  // 다크는 --success가 이미 충분해 동일 값.
  'moss.700': { value: { base: '#0f7536', _dark: '#97c459' } },
  // spot — admin 대시보드 전용 보조 강조색. 채도 낮은 슬레이트 블루.
  // 차트의 데이터 색(선·막대·점)과 오늘 조회수 강조가 이 하나를 쓴다 — accent는
  // 잉크라 데이터를 칠하면 축·글자와 갈리지 않는다. 공개 페이지에는 쓰지 않는다.
  'spot.600': { value: { base: '#4f6d8f', _dark: '#8fb0d4' } },
  // danger — 에러/위험. 레퍼런스 --danger (#DC2626 / #F09595).
  'danger.text': { value: { base: '#c81e1e', _dark: '#f09595' } },
  'danger.bg': {
    value: {
      base: 'rgba(220,38,38,0.08)',
      _dark: 'rgba(240,149,149,0.12)',
    },
  },
  'danger.border': { value: { base: '#dc2626', _dark: '#f09595' } },
  // warn — 레퍼런스 --warn-bg / --warn-fg. Dialogue 상대방 아바타와
  // warning 콜아웃이 공유한다.
  'warn.bg': { value: { base: '#faeeda', _dark: '#3a2a10' } },
  'warn.text': { value: { base: '#854f0b', _dark: '#fac775' } },
  // btn.primaryBorder — 주 버튼의 hairline 보더. 면·글자·hover는 accent.solid·
  // accent.onSolid·accent.solidHover다(예전의 버튼 전용 배경 셋은 cyan 명도를 흰 글씨에
  // 맞춘 값이라 accent와 함께 걷었다).
  'btn.primaryBorder': {
    value: {
      base: 'rgba(26,26,26,0.15)',
      _dark: 'rgba(230,232,235,0.12)',
    },
  },
  // scrim — 모달 뒤를 덮는 백드롭. 지면을 가리고 위 패널을 띄우는 역할이라 테마와
  // 무관하게 어둡다. 두 값은 예전 대괄호 이스케이프 그대로다 — 하나로 합치면 한쪽
  // 백드롭이 눈에 띄게 바뀐다.
  'scrim.sheet': {
    value: { base: 'rgba(1,4,9,0.8)', _dark: 'rgba(1,4,9,0.8)' },
  },
  'scrim.dialog': {
    value: { base: 'rgba(0,0,0,0.5)', _dark: 'rgba(0,0,0,0.5)' },
  },
  // callout — 마크다운 콜아웃 타입별 색 (danger는 danger.* 재사용).
  // info는 무채색(구조), warning은 warn.* 를 쓴다. tip은 전용 토큰 없이 잉크 틴트
  // (accent.muted 면 + accent.solid 보더·글자)다 — info와는 면이 1.07 / 1.22로 거의
  // 같아, 불투명 잉크 보더(info는 28% / 32% 알파)와 글리프(+ / i)가 가른다.
  'callout.info.bg': {
    value: {
      base: 'rgba(0,0,0,0.04)',
      _dark: 'rgba(255,255,255,0.06)',
    },
  },
  'callout.info.text': { value: { base: '#4b5563', _dark: '#c2c7ce' } },
  'callout.info.border': {
    value: {
      base: 'rgba(0,0,0,0.28)',
      _dark: 'rgba(255,255,255,0.32)',
    },
  },
  'callout.warn.bg': { value: { base: '#faeeda', _dark: '#3a2a10' } },
  'callout.warn.text': { value: { base: '#854f0b', _dark: '#fac775' } },
  'callout.warn.border': {
    value: { base: '#b8770f', _dark: '#fac775' },
  },
  // ─────────────────────────────────────────────────────────────
  // code — 코드 블록의 표면과 구문 강조.
  //
  // 예전에는 이 값들이 CodeBlock.tsx 안에 hex 상수로 박혀 있었다.
  // 구문 강조 테마(vscDarkPlus)의 색이 고정값이라 라이트 테마에서
  // 배경만 밝히면 대비가 통째로 무너졌고, 그래서 "코드 표면은 테마와
  // 무관하게 항상 어둡다"를 규칙으로 삼았기 때문이다. 라이트 화면
  // 한가운데에 검은 판이 박혀 있는 셈이라 늘 이물감이 있었다.
  //
  // fumadocs는 shiki의 듀얼 테마로 이걸 푼다 — 토큰마다 라이트/다크
  // 두 색을 CSS 변수(`--shiki-light`/`--shiki-dark`)로 실어 보내고
  // `.dark`에서 어느 쪽을 쓸지만 고른다. 같은 원리를 여기서는 변수
  // **정의**를 semanticToken으로 옮겨서 쓴다. 색이 HTML이 아니라
  // 스타일시트에 한 번만 있으므로 마크업은 오히려 가벼워진다.
  //
  // 다크 값은 지금 쓰는 vscDarkPlus 그대로다(코드 화면이 바뀌지
  // 않는다). 라이트 값은 fumadocs가 라이트 테마로 쓰는 github-light
  // 계열에서 가져왔고, 표면(#F7F7F5) 위 대비를 전부 확인했다 —
  // 주석만 원본 #6E7781이 4.24:1로 AA에 못 미쳐 한 톤 내렸다(5.67:1).
  // 나머지는 4.70:1(function) ~ 13.66:1(기본 텍스트) 범위다.
  // ─────────────────────────────────────────────────────────────
  // 표면 — 라이트는 본문(paper.50)에서 한 단계 뜬 서브 서피스,
  // 다크는 기존 코드 표면 값을 유지한다.
  'code.surface': { value: { base: '#f7f7f5', _dark: '#0b0d10' } },
  // 파일명·언어 라벨이 앉는 상단 바. 표면보다 한 단계 더 진하다.
  'code.chrome': { value: { base: '#ededea', _dark: '#14171c' } },
  // 드래그 선택 배경. 전역 selection.bg를 따라가지 않는다 — code.*는 본문 팔레트
  // (paper/ink)와 독립이어야 본문 톤을 손볼 때 코드 화면이 같이 흔들리지 않는다
  // (codeTheme.test.ts가 구문 색 매핑에 같은 규칙을 잠근다). 라이트는 표면 위 파란
  // 계열 토큰(string #0A3069, number #0550AE)을 지우지 않게 고른 회청색이고, 다크는
  // 전역 선택색이 cyan 합성이던 때의 값을 그대로 둔다.
  'code.selection': { value: { base: '#d7dce3', _dark: '#214248' } },
  // 구문 강조 — 키는 "역할", 값은 (github-light, vscDarkPlus) 쌍.
  'code.fg': { value: { base: '#24292f', _dark: '#d4d4d4' } },
  'code.comment': { value: { base: '#5b636d', _dark: '#6a9955' } },
  'code.keyword': { value: { base: '#cf222e', _dark: '#569cd6' } },
  // import/return 처럼 흐름을 바꾸는 키워드만 따로 물들이는 건
  // vscDarkPlus의 특징이다(#c586c0). 라이트에서도 keyword와 구분되게
  // 색상각을 옮긴 값을 쓴다.
  'code.keywordFlow': { value: { base: '#a428b4', _dark: '#c586c0' } },
  'code.string': { value: { base: '#0a3069', _dark: '#ce9178' } },
  'code.number': { value: { base: '#0550ae', _dark: '#b5cea8' } },
  'code.function': { value: { base: '#8250df', _dark: '#dcdcaa' } },
  'code.class': { value: { base: '#953800', _dark: '#4ec9b0' } },
  'code.property': { value: { base: '#0550ae', _dark: '#9cdcfe' } },
  'code.tag': { value: { base: '#116329', _dark: '#569cd6' } },
  // diff의 +/− 줄. vscDarkPlus는 inserted를 숫자(#b5cea8)와, deleted를
  // 문자열(#ce9178)과 같은 색으로 묶어 두는데, 그 둘의 라이트 짝이
  // #0550ae·#0a3069라 라이트에서는 추가·삭제가 둘 다 파랑이 된다.
  // github-light의 markup.inserted/deleted 값으로 갈라 둔다
  // (표면 위 6.89:1 · 9.80:1). 다크는 원본 그대로.
  'code.inserted': { value: { base: '#116329', _dark: '#b5cea8' } },
  'code.deleted': { value: { base: '#82071e', _dark: '#ce9178' } },
  'code.regex': { value: { base: '#a40e26', _dark: '#d16969' } },
  'code.selector': { value: { base: '#6f42c1', _dark: '#d7ba7d' } },
  // 눈에 덜 띄어야 하는 구두점(html 태그 괄호 등).
  'code.muted': { value: { base: '#5b636d', _dark: '#808080' } },
});

/** 팔레트가 값을 갖는 두 테마. */
export type BlogTheme = 'light' | 'dark';

/** 팔레트 색 이름. 오타가 컴파일 에러가 되도록 키로 좁혀 둔다. */
export type BlogColorName = keyof typeof blogColors;

/**
 * 한 테마의 색 값 — **CSS 변수를 못 읽는 렌더러용**.
 *
 * 화면은 토큰 이름으로 색을 쓰지만(`css({ color: 'ink.950' })`), satori/sharp처럼
 * CSS 변수도 oklch도 읽지 못하는 렌더러는 리터럴 값이 필요하다 — 블로그 OG 카드
 * (`public/og/*.png`)와 mermaid 도표가 그렇다. 그런 소비처가 값을 손으로 옮겨
 * 적으면 팔레트를 바꿔도 그림만 옛 색으로 남는데, 렌더는 성공하므로 아무도 실패로
 * 알려주지 않는다. 여기서 뽑아 쓰면 출처가 하나다.
 *
 * **테마를 고르는 분기는 여기 한 곳에만 둔다.** 예전에는 테마별 함수를 따로 두었는데
 * (`darkColor`/`lightColor`), 두 벌이 다 필요한 소비처(mermaid)가 결국 자기 쪽에서
 * 다시 `theme === 'light' ? … : …`를 쓰게 됐다. 분기가 둘이 되면 한쪽만 고쳐질
 * 자리가 생긴다 — 이 파일이 애초에 없애려던 종류의 사본이다. 한 벌만 필요한
 * 소비처(OG 카드)도 `themeColor('dark', …)`로 테마를 명시한다. 이름에 테마를
 * 숨기면 "왜 다크인가"가 호출부에서 사라진다.
 */
export function themeColor(theme: BlogTheme, name: BlogColorName): string {
  const { base, _dark } = blogColors[name].value;
  return theme === 'light' ? base : _dark;
}

const OG_BRAND = '#67e8f9';

/**
 * OG 카드(`public/og/*.png`)의 브랜드 cyan — **Panda 토큰이 아니다.**
 *
 * 화면의 포인트색은 잉크(`accent.*`)로 옮겼지만 OG 카드 디자인은 그대로 둔다. 그래서 cyan은
 * 카드 렌더러(satori)에 넘길 리터럴로만 남는다. 토큰이 아니므로 CSS 변수가 나가지 않고,
 * 앱 `src/`에서 색 이름으로 쓰면 strictTokens에 걸린다(앱 `src/`는 경계상 이 패키지를 import하지도
 * 못한다). 카드는 다크 한 벌이라 라이트 값이 없다. 카드가 썸네일로 쓰이는 글은 홈·목록에서도
 * cyan이 보인다.
 *
 * 값은 2026-10까지의 `accent.500`·`accent.200` 다크 값 그대로다 — 카드 픽셀이 바뀌지 않는다.
 *   color      — 브랜드 사각형·시리즈 pill 글자
 *   pillBorder — 시리즈 pill의 2px 보더(color 42%)
 */
export const ogBrand = {
  color: OG_BRAND,
  pillBorder: rgba(OG_BRAND, 0.42),
} as const;

export const blogPreset = definePreset({
  name: '@blog/preset',
  theme: {
    extend: {
      tokens: {
        radii: {
          // Astryx docsite 테마(MIT)의 라운드 스케일을 이름째 옮겼다 — 코어 기본값(4/8/12/28)에
          // 4px씩 더한 값이고, none·full은 코어 그대로다. 이름은 크기가 아니라 자리다:
          //   inner     — kbd·인라인 코드·작은 안쪽 요소·포커스 링
          //   element   — 입력·세그먼트 그룹·코드 블록·미디어(이미지)
          //   container — 카드·패널·콜아웃·오버레이
          //   page      — 대화 말풍선(<dialogue>)
          //   full      — 버튼(docsite 테마가 버튼을 pill로 덮는다)·배지·태그 칩·원형·스크롤바
          // **라운드는 이 여섯이 전부다** — 블로그 설정이 preset-panda의 radii를 빼므로
          // (apps/blog/web/panda.config.ts) 여기 없는 값은 strictTokens에 걸린다. 자리별 근거와
          // 일부러 다르게 간 곳은 blog-design-system 스킬.
          none: { value: '0' },
          inner: { value: '8px' },
          element: { value: '12px' },
          container: { value: '16px' },
          page: { value: '32px' },
          full: { value: '9999px' },
        },
        borderWidths: {
          // 지면 위 카드·패널·행의 위계는 보더로 낸다(그림자는 떠 있는 표면에만 — 아래
          // semanticTokens.shadows) — hairline 단일 소스. none은 보더를 지우는 자리
          // (마지막 행 등) — radii의 none과 같이 0도 토큰으로 써서 대괄호 이스케이프가 남지 않게 한다.
          none: { value: '0' },
          hairline: { value: '1px' },
        },
        fonts: {
          sans: {
            value:
              'var(--font-pretendard, "Pretendard Variable"), Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
          },
          // serif 정체성 폐기 → serif 토큰을 sans로 매핑해 기존 serif 사용처를
          // 일괄 de-serif. (컴포넌트를 안 건드려도 sans 적용)
          serif: {
            value:
              'var(--font-pretendard, "Pretendard Variable"), Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
          },
          mono: {
            value:
              "var(--font-jetbrains, 'JetBrains Mono'), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          },
        },
        // 색은 전부 semanticTokens.colors(테마-가변 base/_dark)에 있다. 테마와 무관한
        // 색 토큰은 없다 — 주 버튼 글자는 다크에서 면(accent.solid)이 밝아지므로 흰색이
        // 아니라 accent.onSolid다.
        fontSizes: {
          '2xs': { value: '10px' },
          xs: { value: '11px' },
        },
        letterSpacings: {
          tighter: { value: '-0.03em' },
          tightX: { value: '-0.02em' },
          tightSm: { value: '-0.015em' },
          tightXs: { value: '-0.01em' },
          mono: { value: '0.04em' },
          monoLg: { value: '0.06em' },
          monoXl: { value: '0.08em' },
        },
        lineHeights: {
          prose: { value: '1.75' },
          proseLoose: { value: '1.7' },
          relaxed: { value: '1.6' },
          comfortable: { value: '1.55' },
          snug: { value: '1.5' },
          headerSm: { value: '1.4' },
          header: { value: '1.3' },
          tight: { value: '1.25' },
          heroDense: { value: '0.95' },
          flat: { value: '1' },
        },
        sizes: {
          // ─────────────────────────────────────────────────────────────
          // 레일(rail) — 페이지 콘텐츠 칼럼의 폭. **세 개가 전부다.**
          //
          // 이 값은 거터를 **뺀** 순수 콘텐츠 폭이다. 거터는 항상 레일
          // 바깥(`railGutter`)에 있으므로 `railText`를 쓴 화면의 글줄은
          // 어느 페이지에서나 정확히 680px이다. 예전에는 거터를 레일
          // 안쪽에 준 페이지(`px: '8'`)와 바깥에 준 페이지(홈)가 섞여
          // 있어서, 같은 640px 토큰을 쓰고도 실제 폭이 640과 576으로
          // 갈렸다. 레일을 쓸 때는 반드시 `Rail`/`railGutter`를 거친다.
          //
          // 폭이 세 개뿐인 이유는 좌측 기준선이 곧 위계이기 때문이다.
          // 값을 하나 더 만들면 그 페이지만 다른 자리에서 시작하고,
          // 헤더 로고와 본문 제목이 어긋난다(리팩터링 전 실측: 페이지에
          // 따라 최대 248px 차이).
          // ─────────────────────────────────────────────────────────────
          /** 도구형 화면 — 목록/소개/대시보드, 글 상세 셸, 헤더·푸터 */
          railWide: { value: '1200px' },
          /** 읽는 화면 — 홈 허브, 글 본문, 시리즈, 정책. 한글 약 42자/줄 */
          railText: { value: '680px' },
          /** 단일 폼 — 로그인, 404 */
          railForm: { value: '400px' },

          /** 레일이 아니라 콘텐츠 제약 — /about 히어로 우측 문단 */
          heroAside: { value: '480px' },
        },
        // 모션 곡선 — 시간은 아래 semanticTokens.durations. **곡선은 이 셋이 전부다** — 블로그
        // 설정이 preset-panda의 easings를 빼므로(apps/blog/web/panda.config.ts) 다른 이름은
        // strictTokens에, 이스케이프는 prefer-token에 걸린다.
        //   standard — Astryx 코어(MIT)의 --ease-standard. 감속 곡선이라 등장·hover·표식에 쓴다
        //   exit     — Astryx BottomSheet의 닫힘 곡선. 화면 밖으로 나가는 움직임은 가속한다
        //   linear   — 거리 없는 퇴장 페이드(시트 스크림)·스크롤에 묶인 진행 바
        easings: {
          standard: { value: 'cubic-bezier(0.24, 1, 0.4, 1)' },
          exit: { value: 'cubic-bezier(0.3, 0, 0.6, 0.6)' },
          linear: { value: 'linear' },
        },
      },
      semanticTokens: {
        // 모션 시간 — Astryx 코어(MIT) 모션 스케일 아홉 단 중 블로그가 쓰는 넷을 이름째 옮겼다
        // (docsite 테마는 motion을 덮어쓰지 않는다). 어느 움직임이 어느 단계인지는
        // blog-design-system 스킬의 모션 절.
        //   fast      175ms — hover·색·누름·표식·나가는 페이지
        //   fastMax   230ms — 테마 크로스페이드·<details> 펼침
        //   medium    410ms — 시트·스크림·들어오는 페이지
        //   mediumMax 550ms — 검색 다이얼로그 등장·스켈레톤
        // semantic token인 이유는 **움직임 줄이기를 여기 한 곳에서** 끄기 위해서다 — `_motionReduce`가
        // 변수 값을 0.01ms로 바꾸므로 토큰으로 쓴 전환·애니메이션은 컴포넌트가 따로 규칙을 두지
        // 않아도 꺼진다. 0이 아니라 0.01ms인 이유는 transitionend가 그대로 오게 하려는 것이다
        // (퇴장이 끝나야 언마운트하는 시트 — Astryx Drawer와 같은 값). 무한 반복 애니메이션은
        // 0.01ms면 깜빡임이 되므로 시간이 아니라 애니메이션 자체를 끈다(아래 animations).
        // **시간은 이 넷이 전부다** — preset-panda의 durations는 블로그 설정이 뺀다.
        durations: {
          fast: { value: { base: '175ms', _motionReduce: '0.01ms' } },
          fastMax: { value: { base: '230ms', _motionReduce: '0.01ms' } },
          medium: { value: { base: '410ms', _motionReduce: '0.01ms' } },
          mediumMax: { value: { base: '550ms', _motionReduce: '0.01ms' } },
        },
        // 반복 애니메이션 — keyframes는 아래 keyframes에 함께 둔다. 움직임 줄이기에서는 `none`
        // (위 durations 주석의 깜빡임 이유). preset-panda의 animations(spin·ping·pulse·bounce)와
        // keyframes는 블로그 설정이 뺀다.
        //   skeleton — 로딩 자리표시(Astryx Skeleton: 투명도 왕복, mediumMax, alternate)
        animations: {
          skeleton: {
            value: {
              base: 'skeleton-pulse {durations.mediumMax} {easings.linear} infinite alternate',
              _motionReduce: 'none',
            },
          },
        },

        // 그림자는 **떠 있는 표면에만** 쓴다(AGENTS.md §9) — 흐름 밖에 떠서 아래를 가리고
        // 닫히면 사라지는 면. 값은 Astryx 코어(MIT)의 --shadow-med·--shadow-high를 그대로
        // 옮겼다(docsite 테마는 그림자를 덮어쓰지 않는다). light-dark() 쌍을 base/_dark로 나눴다.
        //   med  — 차트 툴팁
        //   high — 다이얼로그·바텀시트
        // **그림자는 이 둘이 전부다** — 블로그 설정이 preset-panda의 shadows를 빼므로 다른 이름은
        // strictTokens에, 이스케이프는 prefer-token에 걸린다. Astryx의 low(팝오버·메뉴)는 쓰는
        // 면이 생길 때 더한다. 어느 면이 어느 단계인지는 blog-design-system 스킬.
        shadows: {
          overlay: {
            med: {
              value: {
                base: '0px 1px 2px rgba(0,0,0,0.1), 0px 2px 12px rgba(0,0,0,0.1)',
                _dark:
                  '0px 1px 2px rgba(0,0,0,0.2), 0px 2px 12px rgba(0,0,0,0.2)',
              },
            },
            high: {
              value: {
                base: '0px 2px 2px rgba(0,0,0,0.1), 0px 8px 24px rgba(0,0,0,0.1)',
                _dark:
                  '0px 2px 2px rgba(0,0,0,0.2), 0px 8px 24px rgba(0,0,0,0.3)',
              },
            },
          },
        },
        colors: blogColors,
      },
      keyframes: {
        // semanticTokens.animations.skeleton. Astryx는 쉬는 투명도가 .25인데, 자리표시 면
        // (paper.100)이 지면과 거의 같은 밝기라 .25에서는 보이지 않는다 — 1 ↔ .5로 왕복한다.
        'skeleton-pulse': {
          from: { opacity: '1' },
          to: { opacity: '0.5' },
        },
      },
    },
  },
});

export default blogPreset;
