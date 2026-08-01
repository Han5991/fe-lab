import {
  DiagramEdge,
  DiagramFrame,
  DiagramLabel,
  DiagramNode,
} from './primitives';
import type { NamedDiagramProps } from './registry';

/**
 * 글 상세 히어로 — ECS 무중단 배포 파이프라인 (640×122).
 *
 * git push → Actions → ECR → ECS 배포. 앞 세 구간은 "그냥 지나가는 구조"라 회색이고,
 * 이 글이 실제로 다루는 마지막 전환(blue/green)만 틸로 강조한다 —
 * 핸드오프 §4의 "핵심 경로에만 포인트색" 규칙.
 * 좌표는 디자인 시안 SVG를 그대로 옮긴 값이다.
 */
export function DeployPipeline({
  className,
  label = 'git push에서 ECS blue/green 배포까지의 파이프라인',
}: NamedDiagramProps) {
  return (
    <DiagramFrame viewBox="0 0 640 122" label={label} className={className}>
      <DiagramEdge x1={132} y1={52} x2={160} y2={52} />
      <DiagramEdge x1={292} y1={52} x2={320} y2={52} />
      <DiagramEdge x1={422} y1={52} x2={450} y2={52} emphasis />

      <DiagramNode
        x={24}
        y={27}
        width={108}
        height={50}
        title="git push"
        subtitle="main 병합"
      />
      <DiagramNode
        x={160}
        y={27}
        width={132}
        height={50}
        title="Actions"
        subtitle="Docker 빌드"
      />
      <DiagramNode
        x={320}
        y={27}
        width={102}
        height={50}
        title="ECR"
        subtitle="이미지 푸시"
      />
      <DiagramNode
        x={450}
        y={27}
        width={160}
        height={50}
        tone="teal"
        title="ECS 배포"
        subtitle="blue/green 전환"
      />

      <DiagramLabel x={530} y={104}>
        ↻ 실패 시 자동 롤백
      </DiagramLabel>
    </DiagramFrame>
  );
}
