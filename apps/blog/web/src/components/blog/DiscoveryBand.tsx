import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
// 배럴(`@/src/components/blog`)이 아니라 파일을 직접 가리킨다. 배럴은
// PostsArchiveView까지 끌고 오고 그 끝에 Supabase 클라이언트가 있어서,
// 이 리프 컴포넌트를 렌더하는 테스트가 환경변수 없이는 뜨지 않는다.
import { Label } from './Label';

interface DiscoveryBandProps {
  /** 아래 목록이 `aria-labelledby`로 가리킬 id. */
  id: string;
  title: string;
  /** 우측 "더 보기" 링크. 그 면이 전체 목록을 따로 갖고 있을 때만 붙인다. */
  more?: { href: string; label: string };
}

/**
 * 발견 면 하나의 머리 줄 — 좌측 라벨 + 우측 "더 보기".
 *
 * 홈은 대표 / 최근 / 시리즈 / 태그, 네 개의 면을 세로로 쌓는다. 면마다 카드나
 * 배경으로 구획을 나누는 대신 **이 줄 하나와 아래 굵기의 보더**로만 나눈다 —
 * 지면에 얹는 상자를 늘리지 않고도 "여기서부터 다른 축의 목록"이 읽힌다.
 *
 * 라벨은 `Label`(mono·uppercase·ink.500)을 그대로 쓴다. 섹션 라벨은 무채색이다
 * — 액센트가 붙는 자리는 제목 계열 넷뿐이고, 여기까지 칠하면 "제목 > 그 외"
 * 위계가 색으로 사라진다.
 *
 * 헤딩 레벨은 h2다. 홈은 h1(이름) → h2(면 라벨) → h3(면 안의 글 제목) 순이라
 * 헤딩 탐색으로 "무슨 축이 있는지 → 그 안에 뭐가 있는지"를 훑을 수 있다.
 */
export const DiscoveryBand = ({ id, title, more }: DiscoveryBandProps) => {
  return (
    <div
      className={css({
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '[4px 16px]',
        mt: '[34px]',
        pb: '[8px]',
        borderBottomWidth: 'hairline',
        borderBottomStyle: 'solid',
        // 면의 시작은 목록 행 사이 보더보다 진하다. 같은 굵기로 두면 면 경계가
        // 행 경계와 구분되지 않아 목록이 하나로 이어져 보인다.
        borderColor: 'ink.borderStrong',
      })}
    >
      <Label as="h2" id={id}>
        {title}
      </Label>
      {more && (
        <Link
          href={more.href}
          className={css({
            fontSize: '[12.5px]',
            color: 'accent.600',
            whiteSpace: 'nowrap',
            transition: '[color 0.15s]',
            _hover: { color: 'accent.700', textDecoration: 'underline' },
          })}
        >
          {more.label}
        </Link>
      )}
    </div>
  );
};
