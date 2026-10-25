import { css } from '@blog/styled-system/css';
import { fmtDate, fmtReadMin } from '@blog/content/client';
import { metaDivider } from '@/src/components/metaDivider';

interface DatelineProps {
  date: string | null;
  readMin: number;
}

const row = css({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '3',
  textStyle: 'prose',
});

// 날짜·읽기 시간은 mono다(blog-design-system 타이포그래피 — 목업의 sans는 Astryx 테마에 mono가 연결되지
// 않은 부작용).
const meta = css({ fontFamily: 'mono', color: 'ink.700' });

/**
 * 글 머리의 날짜 줄 — `날짜 | N분 읽기`. 날짜가 없는 글(dev의 draft)은 그 칸째 빠진다.
 * 작성자 아바타·이름은 두지 않는다 — 글쓴이가 한 명뿐인 블로그라 구분할 것이 없다(작성자는 JSON-LD에 있다).
 * 시리즈 안의 순번(`n/m`)도 두지 않는다 — 시리즈의 위치는 이전·다음 편 카드와 빵부스러기가 맡는다.
 */
export const Dateline = ({ date, readMin }: DatelineProps) => {
  const day = fmtDate(date);
  return (
    <div className={row}>
      {day && (
        <>
          <time dateTime={day} className={meta}>
            {day}
          </time>
          <span aria-hidden="true" className={metaDivider} />
        </>
      )}
      <span className={meta}>{fmtReadMin(readMin)} 읽기</span>
    </div>
  );
};
