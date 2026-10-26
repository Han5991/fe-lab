import { css } from '@blog/styled-system/css';
import {
  coverFrameRaw,
  coverImage,
  noPreloadPicture,
} from '@/src/components/blog/cardParts';
import { PostDetailShared } from '@/src/components/shared/PostSharedElement';
import { DIAGRAMS, isDiagramName } from '@/src/components/diagram/registry';

/** 커버 `<img>`의 width·height — 크기는 CSS(16:9 틀)가 정하고, 이 둘은 비율 힌트다. */
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 675;

// 카드 커버와 같은 틀(16:9, hairline은 이미지 위에 덮어 그린다 — cardParts.ts)이다. 라운드는 카드와 같은
// container다.
const frame = css(coverFrameRaw, { rounded: 'container' });

// 이미지가 틀을 어떻게 채우는가는 그림이 가로형인지(`isWideThumbnail` — 기준은 `WIDE_THUMBNAIL_MIN_ASPECT`)로
// 갈린다 — 판정은 카드와 같은 함수이고 여기는 `wide`로 받는다. 카드 커버와의 짝이 갈리는 이유는
// `POST_SHARED_RESCALED`(viewTransitions.ts).
//
// - 가로형(OG 카드, 그리고 1200×630 같은 자기 썸네일): cover다. 1.9:1이라 16:9 틀에 양옆 약 6%만 잘린다.
//   제목이 박힌 OG 카드가 h1 아래에 한 번 더 나오는 것은 모핑을 위해 받아들였다(사용자 결정).
// - 정사각 등 가로형이 아닌 자기 썸네일: contain이다. cover로 채우면 정사각의 위아래가 44% 잘려 그림이 읽히지
//   않는다. 남는 양옆은 틀의 면(paper.100)이다.
const containImage = css({
  display: 'block',
  w: 'full',
  h: 'full',
  objectFit: 'contain',
});

interface PostHeroThumbnail {
  /** 글 카드의 커버와 같은 주소(`resolveThumbnailSrc` — 최적화본이 있으면 webp)라, 카드에서 넘어오면 이미 받은 이미지다. */
  src: string;
  /** `isWideThumbnail(post)` — 참(가로형·OG 카드)이면 cover, 거짓(정사각 등)이면 contain이다. */
  wide: boolean;
}

interface PostHeroProps {
  /** 썸네일이 글 카드의 커버와 이어지는 공유 요소 이름의 열쇠(`PostDetailShared`). */
  slug: string;
  /**
   * frontmatter `hero` — 다이어그램 레지스트리의 이름.
   * 예전에는 이 매핑이 slug → 컴포넌트로 이 파일에 하드코딩돼 있어서, 글에
   * 다이어그램을 붙이려면 코드를 고쳐야 했다. 이제 글이 스스로 지정한다.
   */
  hero?: string | undefined;
  /** 없으면 썸네일 분기가 빠진다. 모든 글이 가진다 — 썸네일이 없는 글은 OG 카드가 그 자리다. */
  thumbnail?: PostHeroThumbnail | undefined;
}

/**
 * 글 상단 히어로 슬롯. 다이어그램 > 썸네일 > 없음 순으로 하나만 그린다.
 *
 * 등록되지 않은 `hero` 이름은 여기서 조용히 썸네일로 폴백한다 — 오타 하나로
 * 글 전체가 렌더 실패하는 것보다 낫다. 오타는 `lint:posts`가 빌드 전에 잡는다.
 *
 * 썸네일은 글 카드의 커버와 짝이다(`PostDetailShared`) — 다이어그램은 카드에 없는 그림이라 이어 붙이지 않는다.
 *
 * 블록 사이 간격(40)은 쓰는 쪽(글 칼럼의 flex gap)이 준다.
 */
export const PostHero = ({ slug, hero, thumbnail }: PostHeroProps) => {
  // `getDiagram(hero)`가 아니라 맵을 직접 인덱싱한다 — react-hooks/static-components는
  // "렌더 중 **함수 호출**로 얻은 대문자 값"을 렌더마다 새로 만들어지는 컴포넌트로
  // 보고 에러를 낸다. 모듈 상수 맵의 인덱싱은 렌더 간 같은 참조라 그 오탐을 피한다.
  const Diagram = isDiagramName(hero) ? DIAGRAMS[hero] : undefined;

  if (Diagram) {
    return <Diagram />;
  }

  if (thumbnail) {
    const cover = (
      <div className={frame}>
        {/* LCP 후보다 — 첫 화면의 가장 큰 이미지라 바로, 높은 우선순위로 받는다. `alt=""`: 바로 위
              h1이 이 글의 이름이고, 그림은 제목을 되풀이하지 않는 장식이다(check-seo가 허용한다). */}
        {/* `<picture>`는 RSC 페이로드에 preload 힌트를 싣지 않으려는 것이다(`noPreloadPicture` 주석). */}
        <picture className={noPreloadPicture}>
          <img
            src={thumbnail.src}
            alt=""
            width={COVER_WIDTH}
            height={COVER_HEIGHT}
            fetchPriority="high"
            decoding="async"
            className={thumbnail.wide ? coverImage : containImage}
          />
        </picture>
      </div>
    );
    return (
      <PostDetailShared part="cover" slug={slug} rescaled={!thumbnail.wide}>
        {cover}
      </PostDetailShared>
    );
  }

  return null;
};
