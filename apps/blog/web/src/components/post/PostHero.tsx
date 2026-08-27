import { css } from '@design-system/ui-lib/css';
import { postHeroKey } from '@/shared/transitions';
import { DIAGRAMS, isDiagramName } from '@/src/components/diagram/registry';

interface PostHeroProps {
  slug: string;
  title: string;
  /**
   * frontmatter `hero` — 다이어그램 레지스트리의 이름.
   * 예전에는 이 매핑이 slug → 컴포넌트로 이 파일에 하드코딩돼 있어서, 글에
   * 다이어그램을 붙이려면 코드를 고쳐야 했다. 이제 글이 스스로 지정한다.
   */
  hero?: string | undefined;
  /** frontmatter thumbnail이 있을 때만 채워진다(page.tsx에서 분기) */
  thumbnailUrl?: string | undefined;
}

/**
 * 글 상단 히어로 슬롯. 다이어그램 > 썸네일 > 없음 순으로 하나만 그린다.
 *
 * 등록되지 않은 `hero` 이름은 여기서 조용히 썸네일로 폴백한다 — 오타 하나로
 * 글 전체가 렌더 실패하는 것보다 낫다. 오타는 `lint:posts`가 빌드 전에 잡는다.
 */
export const PostHero = ({
  slug,
  title,
  hero,
  thumbnailUrl,
}: PostHeroProps) => {
  // `getDiagram(hero)`가 아니라 맵을 직접 인덱싱한다 — react-hooks/static-components는
  // "렌더 중 **함수 호출**로 얻은 대문자 값"을 렌더마다 새로 만들어지는 컴포넌트로
  // 보고 에러를 낸다. 모듈 상수 맵의 인덱싱은 렌더 간 같은 참조라 그 오탐을 피한다.
  const Diagram = isDiagramName(hero) ? DIAGRAMS[hero] : undefined;

  // 목록 카드는 실제 썸네일이 있는 글에만 data-hero-exit-key를 붙인다
  // (PostGridCard). 다이어그램으로 갈아끼워도 짝이 어긋나지 않도록 enter 키는
  // "썸네일 보유 여부" 기준으로 그대로 유지한다.
  const heroEnterKey = thumbnailUrl ? postHeroKey(slug) : undefined;

  if (Diagram) {
    return (
      <div
        data-hero-enter-key={heroEnterKey}
        // 레퍼런스는 SVG mb 6px + 뒤 블록 mt 18px = 24px 간격이다.
        className={css({ mb: '[24px]' })}
      >
        <Diagram />
      </div>
    );
  }

  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={title}
        width={1200}
        height={630}
        data-hero-enter-key={heroEnterKey}
        // 다이어그램 분기와 같은 24px 리듬을 쓴다 — 히어로가 무엇으로 채워지든
        // 본문 첫 블록까지의 간격이 달라질 이유가 없다.
        className={css({
          display: 'block',
          mb: '[24px]',
          w: 'full',
          h: 'auto',
          rounded: 'card',
          borderWidth: 'hairline',
          borderColor: 'ink.border',
        })}
      />
    );
  }

  return null;
};
