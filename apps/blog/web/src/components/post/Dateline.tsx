import { css } from '@blog/styled-system/css';
import { fmtDate, fmtReadMin } from '@blog/content/client';
import { AUTHOR_ALTERNATE_NAME } from '@/content.values.mts';
import { metaDivider } from '@/src/components/metaDivider';

interface BylineProps {
  date: string | null;
  readMin: number;
}

const row = css({
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  textStyle: 'prose',
});

// 아바타 이미지는 없다(공개 저장소에 사진이 없고, 외부 이미지는 e2e의 hermetic 스텁과 개인정보가 붙는다).
// 이름의 첫 글자를 원에 담는다 — 이름 텍스트가 바로 옆에 있어 접근 이름은 거기서 나오고, 원은 장식이다.
const avatar = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: '0',
  boxSize: '9',
  rounded: 'full',
  bg: 'paper.200',
  color: 'ink.950',
  textStyle: 'h4',
});

const items = css({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '3',
});

// 날짜·읽기 시간은 mono다(blog-design-system 타이포그래피 — 목업의 sans는 Astryx 테마에 mono가 연결되지
// 않은 부작용).
const meta = css({ fontFamily: 'mono', color: 'ink.700' });

/**
 * 글 머리의 바이라인 — `[아바타] 이름 | 날짜 | N분 읽기`. 날짜가 없는 글(dev의 draft)은 그 칸째 빠진다.
 * 시리즈 안의 순번(`n/m`)은 두지 않는다 — 시리즈의 위치는 이전·다음 편 카드와 빵부스러기가 맡는다.
 */
export const Byline = ({ date, readMin }: BylineProps) => {
  const day = fmtDate(date);
  return (
    <div className={row}>
      <span aria-hidden="true" className={avatar}>
        {Array.from(AUTHOR_ALTERNATE_NAME)[0]}
      </span>
      <div className={items}>
        <span>{AUTHOR_ALTERNATE_NAME}</span>
        {day && (
          <>
            <span aria-hidden="true" className={metaDivider} />
            <time dateTime={day} className={meta}>
              {day}
            </time>
          </>
        )}
        <span aria-hidden="true" className={metaDivider} />
        <span className={meta}>{fmtReadMin(readMin)} 읽기</span>
      </div>
    </div>
  );
};
