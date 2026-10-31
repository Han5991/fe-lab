import { css } from '@blog/styled-system/css';
import {
  HEADING_CODE_FONT_SIZE,
  inlineCodeChip,
} from '@/src/components/post/inlineCode';
import type { TocPart } from '@/src/components/tocHooks';

/** 제목 안 코드는 둘러싼 글자 크기를 따른다 — 본문 제목의 인라인 코드와 같은 값이다. */
const codePart = css(inlineCodeChip, {
  fontSize: HEADING_CODE_FONT_SIZE,
  py: '0',
});

/** 차례 항목의 글자 — 제목 안 인라인 코드는 본문과 같은 칩으로 그린다(데스크톱·모바일 차례 공용). */
export const TocTitle = ({ parts }: { parts: TocPart[] }) =>
  parts.map((part, i) =>
    part.code ? (
      <code key={i} className={codePart}>
        {part.text}
      </code>
    ) : (
      part.text
    ),
  );
