<script lang="ts">
  import type { PageProps } from './$types';
  import { css, cx } from '../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import Label from '$lib/components/Label.svelte';
  import { ABOUT_PATH } from '$lib/shared/routes';
  import { AUTHOR_GITHUB, AUTHOR_LINKEDIN } from '@blog/site-values';

  /** `apps/blog/web/src/app/about/page.tsx`의 이식이다. */
  const { data }: PageProps = $props();

  const SEARCH_DESCRIPTION =
    '프론트엔드 엔지니어 한상욱(Sangwook Han)의 소개 페이지입니다. Mantine·Node.js·Next.js·gemini-cli 오픈소스 기여자이자 FEConf 2025·TeoConf 발표자. 번들러 내부와 TypeScript 설계를 파고듭니다.';

  const socialBtn = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2',
    px: '[16px]',
    py: '[6px]',
    bg: 'paper.200',
    color: 'ink.800',
    borderWidth: '[1px]',
    borderStyle: 'solid',
    borderColor: 'ink.border',
    rounded: '[6px]',
    fontSize: 'sm',
    fontWeight: 'medium',
    textDecoration: 'none',
    transition: '[background 0.15s, border-color 0.15s]',
    _hover: { bg: 'paper.300', borderColor: 'ink.borderStrong' },
  });

  const sectionHead = css({
    display: 'flex',
    alignItems: 'baseline',
    gap: '3',
    mb: '6',
    pb: '4',
    borderBottomWidth: '[1px]',
    borderColor: 'ink.border',
  });
  const sectionTitle = css({
    fontSize: { base: 'lg', md: 'xl' },
    fontWeight: 'semibold',
    color: 'ink.950',
    letterSpacing: 'tight',
  });
  /** 행 hover — 왼쪽 마커 바가 서고 내용이 한 칸 들어간다. */
  const row = css({
    borderBottomWidth: '[1px]',
    borderColor: 'ink.border',
    textDecoration: 'none',
    transition: '[background 0.15s, box-shadow 0.15s, padding 0.15s]',
    _hover: { bg: 'paper.100', boxShadow: 'markerLeft', pl: '4' },
  });
  const rowName = css({
    fontFamily: 'serif',
    fontWeight: 'semibold',
    color: 'ink.950',
    fontSize: 'md',
    display: 'block',
    mb: '0.5',
  });
</script>

<Seo
  title="소개 | Frontend Lab"
  description={SEARCH_DESCRIPTION}
  canonical={`${data.site.url}${ABOUT_PATH}`}
  ogImage={`${data.site.url}${data.site.ogDefaultImage}`}
  siteName={data.site.name}
/>

<div class={css({ bg: 'paper.50' })}>
  <!-- 배경이 화면 끝까지 가야 하므로 거터가 <header> 안쪽이다 — 레일만 감싸면
       색 띠가 좌우로 잘린다. -->
  <header
    class={css({
      bg: 'paper.100',
      borderBottomWidth: '[1px]',
      borderColor: 'ink.border',
    })}
  >
    <Rail
      width="wide"
      class={css({
        py: { base: '14', md: '20' },
        display: 'grid',
        gridTemplateColumns: { base: '1fr', md: '1fr 1fr' },
        gap: '12',
        alignItems: 'end',
      })}
    >
      <div>
        <Label class={css({ display: 'block', mb: '4' })}>
          PROFILE — FRONTEND ENGINEER
        </Label>
        <!-- 홈 히어로의 같은 이름과 맞춘다. 로마자 부제·소개 문단·섹션 라벨은
             무채색으로 남는다. (`serif` 토큰은 preset에서 sans로 매핑돼 있다) -->
        <h1
          class={css({
            fontFamily: 'serif',
            fontSize: { base: '5xl', md: '6xl' },
            fontWeight: 'normal',
            letterSpacing: 'tighter',
            lineHeight: 'heroDense',
            color: 'accent.900',
            mb: '4',
          })}
        >
          한상욱<span
            class={css({
              display: 'block',
              fontSize: { base: 'lg', md: 'xl' },
              fontWeight: 'normal',
              color: 'ink.600',
              mt: '1',
              letterSpacing: 'normal',
            })}>Sangwook Han</span
          >
        </h1>
        <p
          class={css({
            fontFamily: 'serif',
            fontSize: { base: 'md', md: 'lg' },
            color: 'ink.700',
            lineHeight: 'comfortable',
            maxW: 'heroAside',
          })}
        >
          번들러 내부 구조, TypeScript 설계 패턴, 오픈소스 기여를 탐구합니다. 직접
          실험하고 기록하며 배운 것들을 이 블로그에 남깁니다.
        </p>
      </div>

      <div
        class={css({
          display: 'flex',
          flexDirection: 'column',
          gap: '6',
          alignSelf: 'start',
          pt: { md: '8' },
        })}
      >
        <div class={css({ display: 'flex', gap: '3', flexWrap: 'wrap' })}>
          <a href={AUTHOR_GITHUB} target="_blank" rel="noopener noreferrer" class={socialBtn}
            >GitHub →</a
          >
          <a href={AUTHOR_LINKEDIN} target="_blank" rel="noopener noreferrer" class={socialBtn}
            >LinkedIn →</a
          >
        </div>

        <div
          class={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6',
            pt: '6',
            borderTopWidth: '[1px]',
            borderColor: 'ink.border',
          })}
        >
          {#each data.stats as stat (stat.label)}
            <div>
              <div
                class={css({
                  fontFamily: 'serif',
                  fontSize: { base: '4xl', md: '5xl' },
                  fontWeight: 'normal',
                  color: 'ink.950',
                  letterSpacing: 'tight',
                  lineHeight: 'flat',
                  fontVariantNumeric: 'tabular-nums',
                })}
              >
                {stat.value}
              </div>
              <div
                class={css({
                  fontFamily: 'mono',
                  fontSize: '2xs',
                  color: 'ink.500',
                  letterSpacing: 'mono',
                  textTransform: 'uppercase',
                  mt: '1',
                })}
              >
                {stat.label}
              </div>
            </div>
          {/each}
        </div>

        <a
          href={data.retrospectHref}
          class={css({
            fontFamily: 'mono',
            fontSize: 'xs',
            color: 'ink.500',
            letterSpacing: 'monoXl',
            textDecoration: 'none',
            transition: '[color 0.15s]',
            _hover: { color: 'ink.950' },
          })}>2025 회고 전체 읽기 →</a
        >
      </div>
    </Rail>
  </header>

  <Rail
    width="wide"
    class={css({
      py: { base: '12', md: '20' },
      display: 'grid',
      gridTemplateColumns: { base: '1fr', lg: '1fr 1fr' },
      gap: { base: '12', lg: '16' },
    })}
  >
    <section>
      <div class={sectionHead}><h2 class={sectionTitle}>오픈소스 기여</h2></div>
      <div>
        {#each data.oss as item (item.project)}
          <a href={item.href} class={cx(row, css({ display: 'block', py: '5' }))}>
            <div
              class={css({
                display: 'flex',
                alignItems: 'baseline',
                gap: '2',
                mb: '1.5',
              })}
            >
              <span
                class={css({
                  fontFamily: 'serif',
                  fontWeight: 'semibold',
                  fontSize: 'lg',
                  color: 'ink.950',
                })}>{item.project}</span
              >
              <Label class={css({ letterSpacing: 'mono' })}>{item.org}</Label>
            </div>
            <p class={css({ fontSize: 'sm', color: 'ink.700', lineHeight: 'relaxed' })}>
              {item.description}
            </p>
          </a>
        {/each}
      </div>
    </section>

    <div class={css({ display: 'flex', flexDirection: 'column', gap: '12' })}>
      <section>
        <div class={sectionHead}><h2 class={sectionTitle}>발표</h2></div>
        <div>
          {#each data.talks as item (item.event)}
            <a
              href={item.href}
              class={cx(
                row,
                css({
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '4',
                  py: '4',
                }),
              )}
            >
              <div>
                <span class={rowName}>{item.event}</span>
                <span class={css({ fontSize: 'xs', color: 'ink.500' })}>
                  {item.description}
                </span>
              </div>
              <span
                class={css({
                  fontFamily: 'mono',
                  fontSize: 'sm',
                  color: 'ink.500',
                  flexShrink: 0,
                })}>→</span
              >
            </a>
          {/each}
        </div>
      </section>

      <section>
        <div class={sectionHead}><h2 class={sectionTitle}>주요 시리즈</h2></div>
        <div class={css({ display: 'flex', flexDirection: 'column' })}>
          {#each data.series as s (s.id)}
            <!-- /series 페이지와 같은 링크 문법. 아카이브는 `tab`을 읽지 않고
                 `q`는 series와 AND로 걸리므로 series 하나만 넘긴다. -->
            <a
              href={s.href}
              class={cx(
                row,
                css({
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  gap: '4',
                  py: '4',
                }),
              )}
            >
              <div class={css({ flex: '1', minW: '0' })}>
                <span class={cx(rowName, css({ mb: '1' }))}>{s.title}</span>
                <p class={css({ fontSize: 'xs', color: 'ink.700', lineHeight: 'relaxed' })}>
                  {s.description}
                </p>
              </div>
              {#if s.count !== undefined}
                <span
                  class={css({
                    fontFamily: 'mono',
                    fontSize: '2xs',
                    color: 'marker.600',
                    letterSpacing: 'monoXl',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    pt: '0.5',
                  })}>{s.count}편</span
                >
              {/if}
            </a>
          {/each}
        </div>
      </section>
    </div>
  </Rail>
</div>
