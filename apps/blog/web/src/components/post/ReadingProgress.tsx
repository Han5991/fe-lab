'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { css } from '@blog/styled-system/css';
import { Portal } from '../Portal';
import { siteHeaderStyle } from '../siteHeader';

/** 진행도를 몇 칸으로 나눠 갱신하는가 — 0.5%마다 한 번(모바일 폭에서 한 칸이 2px 남짓). */
export const PROGRESS_STEPS = 200;

/**
 * 페이지 최상단 진행률 바 — 스크롤 프레임마다가 아니라 **한 칸(0.5%)을 지날 때마다** 갱신한다.
 *
 * 예전에는 CSS `scroll()` 타임라인에 `scaleX`를 묶었다. JS는 없었지만 Chromium은 스크롤 프레임마다 그
 * 애니메이션의 스타일을 메인 스레드에서 다시 계산했고(`will-change`로도 그대로), 카카오톡 인앱 브라우저에서
 * 글 상세의 스크롤이 버벅였다. JS scroll 리스너로 바꾸면 같은 재계산에 JS가 더해진다.
 *
 * 그래서 갱신 횟수를 줄인다. 스크롤 가능한 거리를 `PROGRESS_STEPS`칸으로 나눈 자리마다 표지(sentinel)를 깔고
 * IntersectionObserver로 본다 — 콜백은 표지가 화면 위 끝을 넘을 때만 온다. 바는 지난 표지 수만큼
 * `scaleX`로 놓는다.
 *
 * 칸 사이를 잇는 `transform` 전환은 **lg 이상에만** 둔다. 스크롤 중에는 칸마다 전환이 다시 시작돼 거의
 * 늘 하나가 돌고, 그 동안 메인 스레드가 스타일을 계속 다시 계산해 CSS 타임라인과 다를 게 없어진다
 * (2026-10-25, 빌드한 글 상세·모바일 412px·CPU 4배 감속·터치 스크롤 세 번 — 스타일 재계산, 회차마다 같은
 * 조건 비교: ① 바 없음 43·45회, 100칸 전환 없음 95·98회, 100칸 전환 297·310회, 예전 CSS 타임라인 234·246회
 * ② 바 없음 45·46회, 100칸 83·76회, 200칸 104·89회, 예전 CSS 타임라인 233·227회).
 *
 * 칸이 200개인 이유: 100칸(모바일 폭에서 한 칸 4px)은 카카오톡 인앱 브라우저에서 바가 계단처럼 올라가는 게
 * 보였다. 200칸(2px)은 갱신이 그만큼 늘지만 위 ②처럼 예전 CSS 타임라인의 절반 아래다.
 *
 * 관찰 기준은 화면이 아니라 **화면 위 끝의 선**(높이 0인 root — `rootMargin` 아래 -100%)이고, 표지 k는
 * 자기 자리에서 트랙 끝 너머까지 내려가는 긴 띠다. 그래서 "지났다"는 곧 "그 선에 걸려 있다"(교차)이고,
 * 한 번에 여러 칸을 건너뛰어도(빠른 플링, 맨 위로 버튼, 앵커 이동) 교차 여부가 바뀌니 콜백이 빠지지 않는다.
 * 1px 표지였을 때는 화면 아래에서 위로 한 번에 건너뛴 표지가 교차를 한 번도 거치지 않아 아무 알림도
 * 없었다(헤드리스 실측: 끝까지 내려도 33%).
 */
export const ReadingProgress = () => {
  const barRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        aria-hidden="true"
        style={siteHeaderStyle}
        className={css({
          pos: 'fixed',
          // 사이트 헤더 바로 아래 — 헤더 높이는 siteHeader가 정한다.
          top: '[var(--site-header-height)]',
          left: '0',
          right: '0',
          h: '[3px]',
          zIndex: '9',
          bg: 'transparent',
          pointerEvents: 'none',
        })}
      >
        <div
          ref={barRef}
          className={css({
            h: 'full',
            w: 'full',
            bg: 'accent.solid',
            transformOrigin: '[0% 50%]',
            transform: '[scaleX(0)]',
            // 칸 사이를 잇는 전환은 lg 이상에만(머리 주석). 움직임 줄이기는 시간 토큰이 끈다.
            lg: {
              transitionProperty: 'transform',
              transitionDuration: 'fast',
              transitionTimingFunction: 'standard',
            },
          })}
        />
      </div>
      {/* 표지는 문서 맨 위에서 재야 한다 — body로 portal해 위치를 잡은 조상(헤더·페이지 경계) 밖에 둔다. */}
      <Portal>
        <ProgressTrack barRef={barRef} />
      </Portal>
    </>
  );
};

/**
 * 표지를 까는 트랙과 그 관찰. portal은 하이드레이션 뒤에야 붙으므로 관찰도 트랙이 붙을 때 함께 시작한다 —
 * 바 쪽 effect에서 트랙을 찾으면 첫 커밋에는 트랙이 아직 없다.
 */
function ProgressTrack({
  barRef,
}: {
  barRef: RefObject<HTMLDivElement | null>;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const track = trackRef.current;
    if (!bar || !track) return;

    // 트랙 높이 = 문서 높이 - 화면 높이(= 스크롤 가능 거리)다. 화면 높이는 CSS의 100lvh가 맡아 모바일
    // 주소창이 접히고 펴질 때 다시 잴 일이 없다(lvh는 주소창이 접힌 큰 화면 — 스크롤 거리가 가장 짧은 쪽이라
    // 끝에서 100%에 닿는다). 문서 높이만 본문이 늘거나 줄 때(이미지·코드 탭·댓글) 다시 잰다.
    const fit = () => {
      track.style.setProperty(
        '--doc-height',
        `${document.documentElement.scrollHeight}px`,
      );
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(document.body);

    // 표지가 화면 위 끝의 선에 걸려 있으면(= 머리가 그 선을 넘었으면) 지난 것이다.
    const passed = new Array<boolean>(PROGRESS_STEPS).fill(false);
    const sentinels = Array.from(track.children);
    const intersect = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          const index = sentinels.indexOf(entry.target);
          if (index !== -1) passed[index] = entry.isIntersecting;
        }
        const count = passed.filter(Boolean).length;
        bar.style.transform = `scaleX(${count / PROGRESS_STEPS})`;
      },
      { rootMargin: '0px 0px -100% 0px' },
    );
    for (const sentinel of sentinels) intersect.observe(sentinel);

    return () => {
      resize.disconnect();
      intersect.disconnect();
    };
  }, [barRef]);

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      className={css({
        pos: 'absolute',
        top: '0',
        left: '0',
        w: '[1px]',
        h: '[max(0px, calc(var(--doc-height, 0px) - 100lvh))]',
        pointerEvents: 'none',
        visibility: 'hidden',
      })}
    >
      {Array.from({ length: PROGRESS_STEPS }, (_, i) => (
        // 표지 k(1~100)는 트랙의 k% 지점에서 트랙 끝 8px 아래까지 내려간다 — 스크롤 끝(트랙 끝)에서도
        // 위 끝의 선에 걸려 있도록. 머리는 1px 위로 당겨, 소수점 스크롤에서 마지막 칸이 99%에 멈추지 않게 한다.
        <div
          key={i}
          className={css({
            pos: 'absolute',
            left: '0',
            bottom: '[-8px]',
            w: '[1px]',
          })}
          style={{ top: `calc(${((i + 1) * 100) / PROGRESS_STEPS}% - 1px)` }}
        />
      ))}
    </div>
  );
}
