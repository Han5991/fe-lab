import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';

import { NavLinks } from './home/NavLinks';
import { SearchDialog } from './search/SearchDialog';
import { ThemeToggle } from './ThemeToggle';

/**
 * 레일 치수는 **리터럴로 적는다.** 상수로 빼서 import하면 안 된다.
 *
 * Panda는 빌드 타임에 소스를 정적으로 훑어 CSS를 만드는데, 다른 파일에서
 * import한 식별자는 값을 알 수 없어 규칙을 생성하지 않는다. 런타임 `css()`는
 * 클래스 이름을 그대로 만들어 붙이므로 **클래스는 있는데 규칙이 없는** 상태가
 * 되고, 화면에서는 조용히 무시된다(실제로 이 레일 작업에서 본문이 상단 바
 * 아래로 파고들었다 — `pt_[52px]`가 마크업에는 있었지만 CSS에는 없었다).
 *
 * 그래서 아래 두 수치는 세 곳에 같은 리터럴로 적혀 있다. 하나를 바꾸면 나머지도
 * 바꿔야 한다:
 *   · 레일 자신 (이 파일)         — 폭 `[64px]` / 상단 바 높이 `[52px]`
 *   · `Layout`                    — 본문을 비켜 주는 `pl` / `pt`
 *   · `ReadingProgress`           — 진행률 바의 `left` / `top`
 */

const wordmark = css({
  fontFamily: 'mono',
  fontWeight: 'medium',
  fontSize: '[15px]',
  color: 'ink.950',
  whiteSpace: 'nowrap',
  // 세로 레일에서는 글자도 세로로 눕는다. lg 미만에서는 상단 바라 가로쓰기다.
  writingMode: { base: '[horizontal-tb]', lg: '[vertical-rl]' },
  transition: '[opacity 0.15s]',
  _hover: { opacity: '0.7' },
});

/**
 * 사이트 크롬 — `lg` 이상에서는 왼쪽 세로 레일, 그 아래에서는 상단 바.
 *
 * **fixed로 띄우고 문서 스크롤은 body에 남긴다.** 레일을 그리드 트랙으로 만들고
 * 본문에 자체 스크롤 컨테이너를 주면 `window.scrollY`를 읽는 것들이 전부 죽는다
 * — 읽기 진행률 바, 맨 위로 버튼, 차례의 활성 헤딩 판정, sticky 사이드바,
 * `scroll-behavior: smooth` 앵커 점프까지. 레일만 화면에 고정하면 그 전제가
 * 그대로 유지된다.
 *
 * 랜드마크는 `<header>` 하나다. 지금도 banner는 이것뿐이라 태그를 바꾸면
 * banner가 사라지고, 상단 바를 따로 두면 banner가 둘이 된다.
 */
export const SiteRail = () => {
  return (
    <header
      className={css({
        pos: 'fixed',
        zIndex: '10',
        top: '0',
        left: '0',
        // 가로 바 ↔ 세로 레일. 폭·높이·방향이 한 벌로 뒤집힌다.
        right: { base: '0', lg: '[auto]' },
        bottom: { base: '[auto]', lg: '0' },
        w: { base: '[auto]', lg: '[64px]' },
        h: { base: '[52px]', lg: '[auto]' },

        display: 'flex',
        flexDir: { base: 'row', lg: 'column' },
        alignItems: 'center',
        gap: { base: '[10px]', lg: '[22px]' },
        px: { base: '[20px]', lg: '0' },
        py: { base: '0', lg: '[18px]' },

        // 위계는 hairline 보더 하나로만. 그림자·그라데이션은 쓰지 않는다.
        borderColor: 'ink.border',
        borderBottomWidth: { base: 'hairline', lg: '[0]' },
        borderRightWidth: { base: '[0]', lg: 'hairline' },
        borderStyle: 'solid',

        // 상단 바는 본문이 아래로 지나가므로 반투명 + 흐림을 유지한다.
        // 세로 레일은 본문과 나란히 서서 겹치지 않으므로 불투명 서피스로 둔다.
        bg: { base: 'paper.50/80', lg: 'paper.100' },
        backdropFilter: { base: 'auto', lg: '[none]' },
        backdropBlur: '[12px]',
      })}
    >
      {/* 로고 표기만 sangwook.dev. metadata/JSON-LD의 사이트명(Frontend Lab)은
          검색 색인 보호를 위해 그대로 둔다. */}
      <Link href="/" className={wordmark}>
        sangwook.dev
      </Link>

      <NavLinks variant="rail" />

      <div
        className={css({
          display: 'flex',
          flexDir: { base: 'row', lg: 'column' },
          alignItems: 'center',
          gap: '[4px]',
          // 바에서는 오른쪽 끝, 레일에서는 아래 끝으로 민다.
          ml: { base: 'auto', lg: '0' },
          mt: { base: '0', lg: 'auto' },
        })}
      >
        <SearchDialog variant="rail" />
        <ThemeToggle />
      </div>
    </header>
  );
};
