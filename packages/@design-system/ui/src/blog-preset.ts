import { definePreset } from '@pandacss/dev';

export const blogPreset = definePreset({
  name: '@design-system/blog',
  theme: {
    extend: {
      tokens: {
        // 강조 좌측 바(about 페이지)는 semanticTokens.shadows 로 내려 라이트/다크
        // accent를 각각 탄다. plain `tokens.*` 는 `_dark` 배리언트를 지원하지 않아
        // hex를 박으면 다크에서도 라이트 틸이 그대로 나온다.
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
          // 페이지 / 카드 / 폼 폭 — 디자인 명세 px 값 토큰화
          containerW: { value: '1200px' },
          // hubW — 허브(홈)·헤더·푸터의 기준 칼럼. 레퍼런스 `.wrap` 720px에서
          // `.screen` 좌우 패딩 40px×2를 뺀 실제 콘텐츠 폭이다. 글 상세는 TOC
          // 사이드바 때문에 더 넓어서 이 토큰을 쓰지 않는다.
          hubW: { value: '640px' },
          dashboardW: { value: '1280px' },
          articleW: { value: '1080px' },
          proseW: { value: '680px' },
          heroAside: { value: '480px' },
          panelW: { value: '800px' },
          formW: { value: '400px' },
        },
      },
      semanticTokens: {
        shadows: {
          markerLeft: {
            value: {
              base: 'inset 3px 0 0 #0891b2',
              _dark: 'inset 3px 0 0 #67e8f9',
            },
          },
        },
        colors: {
          // ─────────────────────────────────────────────────────────────
          // 테마-가변 팔레트 — "무채색 베이스 + 포인트 1색(틸)". 다크 조건은
          // panda.config의 conditions.dark = [data-theme=dark] &.
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
          //   --accent  (시안의 틸은 폐기 — accent.* 항목 주석 참고)
          //   --border  rgba(0,0,0,.10) / rgba(255,255,255,.12) → ink.border
          //
          // `paper.200` 다크만 시안(`#060809`)을 따르지 않고 `#1B1F26`을 쓴다.
          // 시안의 `--page`는 목업 카드 **뒤쪽 바깥 배경**이라 다크에서 `--bg`
          // 보다 더 어둡다. 실제 사이트에는 그 바깥 배경이 없고, `paper.200`이
          // 맡은 역할은 인라인 코드·콜아웃처럼 지면에서 **한 단계 떠 있는**
          // 서피스라 오히려 `--bg`보다 밝아야 한다. 시안 값을 그대로 쓰면
          // 코드 배경이 본문보다 어두워져 파여 보인다.
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
          // accent — 포인트 1색(cyan). 링크 / 시리즈 배지 / 제목 / 다이어그램
          // 핵심 경로에만.
          //
          // ("시안"은 이 파일에서 디자인 목업을 뜻하므로, 색 이름은 혼동을
          //  피해 `cyan`으로 적는다.)
          //
          // 원래 틸(#1D9E75/#5DCAA5)이었다가 cyan으로 옮겼다. 이유는 둘이다.
          // 하나는 **다크 시인성**: 다크 포인트색은 지면(#0B0D10) 위에서 밝은
          // 톤이어야 읽힌다. 후보로 검토한 중간 톤 블루(#4A80E8)는 AA는 통과해도
          // 5.14:1로 틸(9.69:1)의 절반이라 눈에 띄게 탁했다. 지금 값은 13.42:1.
          // 다른 하나는 **의미색과의 거리**: 틸은 success 그린(moss)과 색상각이
          // 가까워 포인트색과 성공 상태가 헷갈렸다. 빨강/노랑/연두는 각각
          // danger·warn·moss와 겹쳐 애초에 후보에서 빠지고, cyan이 네 의미색
          // 어디와도 안 겹치면서 파랑 특유의 흔한 인상도 피한다.
          //
          // accent.500 = 원색. 보더·다이어그램 스트로크·아이콘 등 "비텍스트"
          //   용도(WCAG 비텍스트 대비 3:1 기준). 라이트 3.68:1.
          // accent.600 = 텍스트/링크/제목용. 라이트에서 원색 #0891B2는 흰 배경
          //   위 3.34:1로 AA(4.5:1) 미달이라 같은 색상각에서 명도만 낮춘 값을
          //   쓴다(흰 배경 5.36:1, 배지 배경 위 4.76:1). 다크의 #67E8F9는
          //   13.42:1로 충분해 원색을 그대로 쓴다.
          // accent.700 = hover. 라이트는 더 어둡게, 다크는 더 밝게.
          'accent.50': {
            value: {
              base: 'rgba(8,145,178,0.10)',
              _dark: 'rgba(103,232,249,0.14)',
            },
          },
          'accent.200': {
            value: {
              base: 'rgba(8,145,178,0.38)',
              _dark: 'rgba(103,232,249,0.42)',
            },
          },
          'accent.500': { value: { base: '#0891b2', _dark: '#67e8f9' } },
          'accent.600': { value: { base: '#0e7490', _dark: '#67e8f9' } },
          'accent.700': { value: { base: '#155e75', _dark: '#a5f3fc' } },
          // accent.900 = **제목 전용**. 링크와 달리 제목은 바로 아래 본문보다
          // 약해 보이면 안 된다.
          //
          // 다크는 우연히 균형이 맞는다 — accent 13.42:1 vs 본문 ink.900
          // 13.72:1이라 둘이 같은 무게로 읽히고 차이는 색이 낸다. 라이트는
          // accent.600이 5.36:1인데 본문 ink.900이 15.13:1이라, 제목이 본문보다
          // 3배 흐려서 위계가 뒤집힌다(헤딩 스케일이 22/20/18/16으로 좁아
          // 크기가 이걸 못 메운다).
          //
          // 그래서 라이트만 같은 색상각의 훨씬 진한 톤을 쓴다. 13.40:1로
          // 다크 쪽 13.42:1과 사실상 같아져, 두 테마에서 제목이 같은 무게가 된다.
          // 링크·배지는 계속 accent.600을 쓴다 — 링크까지 이 톤으로 내리면
          // 본문 속에서 색이 안 보인다.
          'accent.900': { value: { base: '#083344', _dark: '#67e8f9' } },
          // marker — 형광펜 하이라이트. 포인트 1색 원칙에 맞춰 cyan으로 통일.
          'marker.300': {
            value: {
              base: 'rgba(8,145,178,0.22)',
              _dark: 'rgba(103,232,249,0.28)',
            },
          },
          'marker.600': { value: { base: '#0e7490', _dark: '#67e8f9' } },
          // moss — success 그린. 레퍼런스 --success (#16A34A / #97C459).
          // 액센트가 시안으로 옮겨가면서 색상각이 충분히 벌어졌지만, 노랑기
          // 있는 그린이라는 성격은 그대로 둔다(경고색과도 구분돼야 한다).
          'moss.600': { value: { base: '#16a34a', _dark: '#97c459' } },
          // moss.700 — 옅은 초록 배경 위 텍스트 전용. 라이트에서 moss.600은
          // 흰 배경 위 3.30:1, 초록 12% 배경 위 2.9:1로 AA 미달이다.
          // 다크는 --success가 이미 충분해 동일 값.
          'moss.700': { value: { base: '#0f7536', _dark: '#97c459' } },
          // spot — admin 대시보드 전용 보조 강조색. 채도 낮은 슬레이트 블루.
          // 액센트가 시안이 되면서 같은 한류 계열이 됐지만, spot은 admin에서만
          // 쓰고 공개 페이지에서 accent와 나란히 놓이는 자리가 없다.
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
          //
          // 틸 시절 다크 값(#178A66 4.32:1 / hover #1D9E75 3.39:1)은 흰 글씨
          // 기준 AA 미달이었다. 시안으로 갈아끼우면서 다크도 흰 글씨가 4.5:1을
          // 넘도록 명도를 다시 잡았다(primary 5.23:1, hover 4.70:1).
          // 다크 hover가 primary보다 밝아지는 방향은 그대로 유지한다.
          'btn.accent': { value: { base: '#0e7490', _dark: '#0e5f75' } },
          'btn.primary': { value: { base: '#0e7490', _dark: '#12768f' } },
          'btn.primaryHover': { value: { base: '#155e75', _dark: '#127e99' } },
          'btn.primaryBorder': {
            value: {
              base: 'rgba(26,26,26,0.15)',
              _dark: 'rgba(230,232,235,0.12)',
            },
          },
          // callout — 마크다운 콜아웃 타입별 색 (danger는 danger.* 재사용).
          // info는 무채색(구조), tip은 포인트 cyan, warning은 warn.* 를 쓴다.
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
              base: 'rgba(8,145,178,0.08)',
              _dark: 'rgba(103,232,249,0.12)',
            },
          },
          'callout.tip.text': { value: { base: '#0e7490', _dark: '#67e8f9' } },
          'callout.tip.border': {
            value: { base: '#0891b2', _dark: '#67e8f9' },
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
