import { definePreset } from '@pandacss/dev';

export const blogPreset = definePreset({
  name: '@design-system/blog',
  theme: {
    extend: {
      tokens: {
        shadows: {
          // marker = 포인트 틸 — 블로그 강조 좌측 바
          markerLeft: { value: 'inset 3px 0 0 #1D9E75' },
        },
        radii: {
          // 핸드오프 §3 "기타": 카드 12px / 작은 요소 8px / 배지 pill.
          // 의미 기반 이름으로 고정해 컴포넌트가 숫자를 직접 쓰지 않게 한다.
          card: { value: '12px' },
          control: { value: '8px' },
          pill: { value: '999px' },
        },
        borderWidths: {
          // "그림자 대신 보더로 위계 표현" — hairline 단일 소스
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
        // 색 팔레트는 semanticTokens.colors 로 이동(테마-가변 base/_dark).
        // paper/ink/accent/marker/moss 이름은 유지 — 컴포넌트가 그대로 소비.
        fontSizes: {
          '2xs': { value: '10px' },
          xs: { value: '11px' },
        },
        letterSpacings: {
          tighter: { value: '-0.03em' },
          tightish: { value: '-0.025em' },
          tightX: { value: '-0.02em' },
          tightSm: { value: '-0.015em' },
          tightXs: { value: '-0.01em' },
          mono: { value: '0.04em' },
          monoLg: { value: '0.06em' },
          monoXl: { value: '0.08em' },
          monoXxl: { value: '0.12em' },
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
          // 페이지 / 카드 / 폼 폭 — 디자인 명세 px 값 토큰화
          containerW: { value: '1200px' },
          // hubW — 허브(홈)·헤더·푸터의 기준 칼럼. 레퍼런스 `.wrap` 720px에서
          // `.screen` 좌우 패딩 40px×2를 뺀 실제 콘텐츠 폭이다. 글 상세는 TOC
          // 사이드바 때문에 더 넓어서 이 토큰을 쓰지 않는다.
          hubW: { value: '640px' },
          dashboardW: { value: '1280px' },
          articleW: { value: '1080px' },
          proseW: { value: '680px' },
          heroSubW: { value: '580px' },
          heroAside: { value: '480px' },
          panelW: { value: '800px' },
          formW: { value: '400px' },
        },
      },
      semanticTokens: {
        colors: {
          // ─────────────────────────────────────────────────────────────
          // 테마-가변 팔레트 — 리뉴얼 기준은 `apps/blog/web/design/
          // design-reference.html`의 :root / [data-theme="dark"] 변수다.
          // "무채색 베이스 + 포인트 1색(틸)". 다크 조건은 panda.config의
          // conditions.dark = [data-theme=dark] &.
          //
          //   레퍼런스 변수 → 토큰
          //   --bg      #FFFFFF / #0B0D10  → paper.50
          //   --bg-sub  #F7F7F5 / #14171C  → paper.100
          //   --page    #EDEDEA / #060809  → paper.200
          //   --fg      #1A1A1A / #E6E8EB  → ink.950
          //   --fg-sub  #6B7280 / #8B919A  → ink.600
          //   --accent  #1D9E75 / #5DCAA5  → accent.500
          //   --border  rgba(0,0,0,.10) / rgba(255,255,255,.12) → ink.border
          //
          // 토큰 이름(paper/ink/accent/marker/moss)은 기존 컴포넌트가 그대로
          // 소비하므로 유지하고 값만 갈아끼운다.
          // ─────────────────────────────────────────────────────────────
          // paper — 서피스
          'paper.50': { value: { base: '#ffffff', _dark: '#0b0d10' } },
          'paper.100': { value: { base: '#f7f7f5', _dark: '#14171c' } },
          'paper.200': { value: { base: '#ededea', _dark: '#1b1f26' } },
          'paper.300': { value: { base: '#e0e0dc', _dark: '#242931' } },
          // ink — 텍스트/보더
          'ink.950': { value: { base: '#1a1a1a', _dark: '#e6e8eb' } },
          'ink.900': { value: { base: '#262626', _dark: '#d5d9de' } },
          'ink.800': { value: { base: '#3a3d42', _dark: '#c2c7ce' } },
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
          // accent — 포인트 1색(틸). 링크 / 시리즈 배지 / 다이어그램 핵심 경로에만.
          //
          // accent.500 = 레퍼런스 --accent 원색. 보더·다이어그램 스트로크·
          //   아이콘 등 "비텍스트" 용도(WCAG 비텍스트 대비 3:1 기준 통과).
          // accent.600 = 텍스트/링크용. 라이트에서 원색 #1D9E75는 흰 배경 위
          //   3.43:1, 배지 배경(accent.50) 위 3.06:1로 AA 미달이라 같은 색상
          //   각(hue)에서 명도만 낮춘 값을 쓴다(흰 배경 4.9:1). 다크의
          //   #5DCAA5는 9.7:1로 충분해 원색을 그대로 유지한다.
          'accent.50': {
            value: {
              base: 'rgba(29,158,117,0.10)',
              _dark: 'rgba(93,202,165,0.14)',
            },
          },
          'accent.200': {
            value: {
              base: 'rgba(29,158,117,0.38)',
              _dark: 'rgba(93,202,165,0.42)',
            },
          },
          'accent.500': { value: { base: '#1d9e75', _dark: '#5dcaa5' } },
          'accent.600': { value: { base: '#157f5e', _dark: '#5dcaa5' } },
          'accent.700': { value: { base: '#0f6549', _dark: '#8fdcc1' } },
          // marker — 형광펜 하이라이트. 포인트 1색 원칙에 맞춰 틸로 통일.
          'marker.300': {
            value: {
              base: 'rgba(29,158,117,0.22)',
              _dark: 'rgba(93,202,165,0.28)',
            },
          },
          'marker.600': { value: { base: '#157f5e', _dark: '#5dcaa5' } },
          // moss — success 그린. 레퍼런스 --success (#16A34A / #97C459).
          // 틸 액센트와 구분되도록 노랑기 있는 그린을 유지한다.
          'moss.100': {
            value: {
              base: 'rgba(22,163,74,0.12)',
              _dark: 'rgba(151,196,89,0.16)',
            },
          },
          'moss.600': { value: { base: '#16a34a', _dark: '#97c459' } },
          // moss.700 — moss.100 배지 위 텍스트 전용(라이트에서 moss.600은
          // 3.6:1로 AA 미달). 다크는 --success가 이미 충분해 동일 값.
          'moss.700': { value: { base: '#0f7536', _dark: '#97c459' } },
          // spot — admin 대시보드 전용 보조 강조색. 포인트 틸과 겹치지 않도록
          // 채도 낮은 슬레이트 블루로 둔다(공개 페이지에서는 쓰지 않는다).
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
          // btn — 버튼 배경. 흰 글씨 대비를 확보한 버튼 전용 명도.
          'btn.accent': { value: { base: '#157f5e', _dark: '#12694e' } },
          'btn.primary': { value: { base: '#157f5e', _dark: '#178a66' } },
          'btn.primaryHover': { value: { base: '#0f6549', _dark: '#1d9e75' } },
          'btn.primaryBorder': {
            value: {
              base: 'rgba(26,26,26,0.15)',
              _dark: 'rgba(230,232,235,0.12)',
            },
          },
          // callout — 마크다운 콜아웃 타입별 색 (danger는 danger.* 재사용).
          // info는 무채색(구조), tip은 포인트 틸, warning은 warn.* 를 쓴다.
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
          'callout.tip.bg': {
            value: {
              base: 'rgba(29,158,117,0.08)',
              _dark: 'rgba(93,202,165,0.12)',
            },
          },
          'callout.tip.text': { value: { base: '#157f5e', _dark: '#5dcaa5' } },
          'callout.tip.border': {
            value: { base: '#1d9e75', _dark: '#5dcaa5' },
          },
          'callout.warn.bg': { value: { base: '#faeeda', _dark: '#3a2a10' } },
          'callout.warn.text': { value: { base: '#854f0b', _dark: '#fac775' } },
          'callout.warn.border': {
            value: { base: '#b8770f', _dark: '#fac775' },
          },
        },
      },
    },
  },
});

export default blogPreset;
