import { DiagramEdge, DiagramFrame, DiagramNode } from './primitives';

interface HeroMotifProps {
  className?: string;
}

/**
 * 홈 히어로 우측 장식 모티프 (210×124).
 *
 * 글자 없는 순수 장식이라 `label`을 주지 않는다 → `aria-hidden`. 이름·소개 옆에서
 * "구조를 그리는 사람"이라는 정체성만 전달하면 되고, 스크린리더에 읽어줄 정보는 없다.
 * 좌표는 `design/design-reference.html`의 SVG를 그대로 옮긴 값이다.
 */
export function HeroMotif({ className }: HeroMotifProps) {
  return (
    <DiagramFrame viewBox="0 0 210 124" className={className}>
      {/* 선을 먼저 그려 노드 밑으로 깔리게 한다(레퍼런스 순서). */}
      <DiagramEdge x1={56} y1={32} x2={96} y2={60} flow="async" arrow={false} />
      <DiagramEdge x1={56} y1={94} x2={96} y2={66} flow="async" arrow={false} />
      <DiagramEdge
        x1={126}
        y1={63}
        x2={164}
        y2={63}
        flow="async"
        emphasis
        arrow={false}
      />

      <DiagramNode x={14} y={19} width={42} height={26} rx={5} tone="teal" />
      <DiagramNode x={14} y={81} width={42} height={26} rx={5} />
      {/* rx가 높이의 절반 → pill. 처리 단계 하나를 캡슐로 구분한 레퍼런스 모양. */}
      <DiagramNode x={96} y={50} width={32} height={26} rx={13} tone="teal" />
      <DiagramNode x={164} y={49} width={34} height={28} rx={5} />
    </DiagramFrame>
  );
}
