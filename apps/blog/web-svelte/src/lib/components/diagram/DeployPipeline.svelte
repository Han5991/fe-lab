<script lang="ts">
  import {
    ARROW_HEAD_PATH,
    arrowHeadTransform,
    captionText,
    diagramFrameFill,
    edgeRoot,
    nodeShape,
    nodeSubtitle,
    nodeTitle,
  } from '$lib/shared/diagramStyles';

  /**
   * 글 상세 히어로 — ECS 무중단 배포 파이프라인 (640×122).
   * `apps/blog/web/src/components/diagram/DeployPipeline.tsx`의 이식이고
   * 좌표가 같다.
   *
   * git push → Actions → ECR → ECS 배포. 앞 세 구간은 "그냥 지나가는 구조"라
   * 회색이고, 이 글이 실제로 다루는 마지막 전환(blue/green)만 액센트다 —
   * "핵심 경로에만 포인트색" 규칙.
   */
  const {
    label = 'git push에서 ECS blue/green 배포까지의 파이프라인',
  }: { label?: string } = $props();

  const EDGES = [
    { x1: 132, y1: 52, x2: 160, y2: 52, emphasis: false },
    { x1: 292, y1: 52, x2: 320, y2: 52, emphasis: false },
    { x1: 422, y1: 52, x2: 450, y2: 52, emphasis: true },
  ] as const;

  const NODES = [
    { x: 24, y: 27, w: 108, h: 50, tone: 'gray', title: 'git push', desc: 'main 병합' },
    { x: 160, y: 27, w: 132, h: 50, tone: 'gray', title: 'Actions', desc: 'Docker 빌드' },
    { x: 320, y: 27, w: 102, h: 50, tone: 'gray', title: 'ECR', desc: '이미지 푸시' },
    { x: 450, y: 27, w: 160, h: 50, tone: 'accent', title: 'ECS 배포', desc: 'blue/green 전환' },
  ] as const;
</script>

<svg viewBox="0 0 640 122" class={diagramFrameFill} role="img" aria-label={label}>
  {#each EDGES as e (e.x1)}
    <g class={e.emphasis ? edgeRoot.emphasis : edgeRoot.plain}>
      <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
      <path d={ARROW_HEAD_PATH} transform={arrowHeadTransform(e.x1, e.y1, e.x2, e.y2)} />
    </g>
  {/each}

  {#each NODES as n (n.x)}
    {@const cx = n.x + n.w / 2}
    {@const cy = n.y + n.h / 2}
    <g>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="8" class={nodeShape[n.tone]} />
      <!-- 부제가 있으면 두 줄이 노드 중앙을 사이에 두고 갈라선다. -->
      <text x={cx} y={cy - 3} text-anchor="middle" class={nodeTitle}>{n.title}</text>
      <text x={cx} y={cy + 14} text-anchor="middle" class={nodeSubtitle}>{n.desc}</text>
    </g>
  {/each}

  <text x="530" y="104" text-anchor="middle" class={captionText}>↻ 실패 시 자동 롤백</text>
</svg>
