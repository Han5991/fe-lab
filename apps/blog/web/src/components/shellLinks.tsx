import { RSS_PATH } from '@blog/content/client';
import { AUTHOR_GITHUB } from '@/content.values.mts';
import { Rss } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { GithubIcon } from './GithubIcon';

/**
 * 셸 링크가 가는 곳 — 그리는 법이 `kind` 하나로 갈린다(`ShellLink`).
 *
 * - `route` — 사이트 안 Next 라우트. `next/link`
 * - `file` — 같은 도메인의 정적 파일(RSS). 맨 `<a>`다 — `next/link`면 클라이언트 내비게이션이 RSC
 *   페이로드를 찾는다. 같은 사이트라 새 탭도 아니다
 * - `external` — 바깥 사이트. 새 탭에서 열고 opener를 끊는다
 */
interface ShellLinkTarget {
  href: string;
  kind: 'route' | 'file' | 'external';
}

/**
 * GitHub·RSS — 저자의 바깥 채널 목록. 헤더 오른쪽(md 이상)과 푸터 오른쪽은 아이콘으로, 홈 히어로는
 * 글자 버튼으로 이 목록을 그린다. 푸터 글자 링크(`Layout`의 `FOOTER_LINKS`)에는 넣지 않는다 — 같은
 * 곳으로 가는 링크가 푸터에 두 번 나오던 것을 걷었다.
 */
export const SOCIAL_LINKS = [
  { href: AUTHOR_GITHUB, kind: 'external', label: 'GitHub', Icon: GithubIcon },
  { href: RSS_PATH, kind: 'file', label: 'RSS', Icon: Rss },
] as const;

export type SocialLabel = (typeof SOCIAL_LINKS)[number]['label'];

interface ShellLinkProps extends ShellLinkTarget {
  className: string;
  /** 아이콘만 있는 링크의 접근 이름. 글자 링크는 글자가 이름이라 주지 않는다. */
  'aria-label'?: string | undefined;
  children: ReactNode;
}

export const ShellLink = ({
  href,
  kind,
  className,
  'aria-label': ariaLabel,
  children,
}: ShellLinkProps) => {
  if (kind === 'route') {
    return (
      <Link href={href} aria-label={ariaLabel} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={className}
      {...(kind === 'external'
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
    >
      {children}
    </a>
  );
};
