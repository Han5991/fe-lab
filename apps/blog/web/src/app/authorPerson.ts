/**
 * 저자 JSON-LD `Person` 노드 — 홈 `@graph`와 About의 `mainEntity`가 같은 `@id`로 내보낸다.
 *
 * 같은 `@id`의 정의가 두 벌이면 한쪽만 고쳐지고, 검색엔진은 어긋난 두 노드를 어느 쪽이
 * 맞는지 모른 채 합친다. 그래서 노드는 여기서 한 번만 만든다. 이름·역할·링크는 해석된
 * 설정의 `author`에서 오고, 이 페이지들에만 나가는 소개·관심사·사진만 여기 적는다.
 */
import contentConfig from '@/content.config.mts';
import { buildAuthorJsonLd } from '@blog/content/client';

const { site: SITE, author: AUTHOR } = contentConfig;

export function buildAuthorPersonJsonLd() {
  return {
    // 글의 author와 같은 공통 필드(@blog/content의 buildAuthorJsonLd)에 이 페이지들에만
    // 나가는 사진·소개·관심사를 더한다.
    ...buildAuthorJsonLd(SITE, AUTHOR),
    image: {
      '@type': 'ImageObject',
      url: 'https://github.com/Han5991.png?size=400',
      width: 400,
      height: 400,
    },
    jobTitle: AUTHOR.role,
    description:
      '번들러 내부 구조, TypeScript 설계 패턴, 오픈소스 기여를 탐구하는 프론트엔드 엔지니어. Mantine, Node.js, gemini-cli, Next.js 오픈소스 기여자.',
    knowsAbout: [
      'React',
      'TypeScript',
      'JavaScript',
      'Module Bundlers',
      'Frontend Architecture',
      'Open Source',
    ],
    sameAs: [AUTHOR.github, AUTHOR.linkedin],
  };
}
