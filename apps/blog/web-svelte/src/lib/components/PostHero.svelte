<script lang="ts">
  import { css } from '../../../styled-system/css';
  import { isDiagramName, type DiagramName } from '@blog/site-values';
  import DeployPipeline from './diagram/DeployPipeline.svelte';

  /**
   * 글 상단 히어로 슬롯. 다이어그램 > 썸네일 > 없음 순으로 **하나만** 그린다.
   * `apps/blog/web/src/components/post/PostHero.tsx`의 이식이다.
   *
   * 등록되지 않은 `hero` 이름은 여기서 조용히 썸네일로 폴백한다 — 오타 하나로
   * 글 전체가 렌더 실패하는 것보다 낫다. 오타는 `lint:posts`의
   * `unknown-hero-diagram`이 빌드 전에 잡는다.
   */
  const {
    title,
    hero,
    thumbnailUrl,
  }: {
    title: string;
    hero?: string | undefined;
    thumbnailUrl?: string | undefined;
  } = $props();

  /**
   * 이름 목록의 단일 출처는 `@blog/site-values`의 `DIAGRAM_NAMES`이고,
   * `content.config.mts`가 같은 목록을 `lint:posts`에도 넘긴다. 그래서 여기서
   * 좁히면 아래 분기가 등록된 이름만 다룬다는 것이 타입으로 보장된다 —
   * 새 이름을 목록에 더하고 분기를 빠뜨리면 `never` 분기에서 걸린다.
   */
  const name = $derived<DiagramName | undefined>(
    isDiagramName(hero) ? hero : undefined,
  );

  // 히어로가 무엇으로 채워지든 본문 첫 블록까지의 간격은 같다(24px).
  const slot = css({ mb: '[24px]' });
</script>

{#if name === 'deploy-pipeline'}
  <div class={slot}><DeployPipeline /></div>
{:else if thumbnailUrl}
  <img
    src={thumbnailUrl}
    alt={title}
    width="1200"
    height="630"
    class={css({
      display: 'block',
      mb: '[24px]',
      w: 'full',
      h: 'auto',
      rounded: 'card',
      borderWidth: 'hairline',
      borderColor: 'ink.border',
    })}
  />
{/if}
