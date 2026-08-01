import { DiagramEdge, DiagramFrame, DiagramNode } from './primitives';

interface ParallelThumbProps {
  className?: string;
  /**
   * 이 그림이 그 글의 구조를 실제로 설명할 때만 준다. **생략하면 장식**으로
   * 보고 접근성 트리에서 감춘다(`DiagramFrame`의 규칙).
   *
   * 예전에는 "동기 처리를 병렬로 나눈 구조 다이어그램"을 기본값으로 뒀는데,
   * 이 그림이 뜨는 자리는 대부분 "썸네일 없는 글의 폴백"이라 어떤 글이 오든
   * 같은 설명이 낭독됐다. 글 주제와 무관한 이름을 붙이느니 장식으로 두는 게
   * 맞다 — 글 제목은 바로 옆 링크가 이미 읽어 준다.
   */
  label?: string;
}

/**
 * 홈 대표 글 카드의 미니 다이어그램 썸네일 (150×92).
 *
 * 하나의 입력이 세 갈래로 갈라지는 "병렬 처리" 모양. 이미지가 아니라 SVG라
 * 다크모드 전환에 별도 에셋이 필요 없다(핸드오프 §4).
 * 좌표는 `design/design-reference.html`의 SVG를 그대로 옮긴 값이다.
 */
export function ParallelThumb({ className, label }: ParallelThumbProps) {
  return (
    <DiagramFrame viewBox="0 0 150 92" label={label} className={className}>
      {/* 세 갈래 전부가 이 글의 핵심 경로라 모두 틸 실선이다. */}
      <DiagramEdge x1={40} y1={46} x2={62} y2={20} emphasis arrow={false} />
      <DiagramEdge x1={40} y1={46} x2={62} y2={46} emphasis arrow={false} />
      <DiagramEdge x1={40} y1={46} x2={62} y2={72} emphasis arrow={false} />

      <DiagramNode x={12} y={34} width={28} height={24} rx={5} />
      <DiagramNode x={62} y={9} width={76} height={20} rx={5} tone="teal" />
      <DiagramNode x={62} y={36} width={76} height={20} rx={5} tone="teal" />
      <DiagramNode x={62} y={63} width={76} height={20} rx={5} tone="teal" />
    </DiagramFrame>
  );
}
