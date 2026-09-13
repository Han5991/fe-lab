<script lang="ts">
  import type { PageProps } from './$types';
  import { css } from '../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import { PRIVACY_PATH } from '$lib/shared/routes';
  import { SITE_URL } from '@blog/site-values';

  const { data }: PageProps = $props();

  /**
   * `apps/blog/web/src/app/privacy/page.tsx`의 이식이다. **본문은 한 글자도
   * 바꾸지 않는다** — 고지 문서라 두 사이트가 다른 말을 하면 그 자체가 문제다.
   * 태그를 추가·제거할 때 React 판과 이 파일을 함께 고칠 것(GTM 컨테이너가
   * 저장소 밖이라 코드만 봐서는 무엇이 발사되는지 알 수 없다).
   */
  const LAST_UPDATED = '2026년 8월 21일';

  const heading = css({
    fontSize: 'xl',
    fontWeight: 'bold',
    mb: '3',
    color: 'ink.950',
  });
  const sub = css({ fontWeight: 'semibold', mb: '1' });
  const small = css({ fontSize: 'sm' });
  const link = css({ color: 'accent.600', _hover: { color: 'accent.700' } });
  const bullets = css({
    mt: '3',
    pl: '5',
    display: 'flex',
    flexDirection: 'column',
    gap: '1',
    listStyleType: 'disc',
  });
</script>

<Seo
  title={`개인정보처리방침 | ${data.site.name}`}
  description="Frontend Lab 블로그의 개인정보처리방침입니다."
  canonical={`${data.site.url}${PRIVACY_PATH}`}
  ogImage={`${data.site.url}${data.site.ogDefaultImage}`}
  siteName={data.site.name}
  noindex
/>

<div class={css({ minHeight: '[calc(100lvh - 231px)]', bg: 'paper.50' })}>
  <!-- 읽는 문서라 글 본문과 같은 text 레일. -->
  <Rail width="text" class={css({ py: '16' })}>
    <h1
      class={css({
        fontSize: '4xl',
        fontWeight: 'extrabold',
        mb: '3',
        color: 'ink.950',
      })}
    >
      개인정보처리방침
    </h1>
    <p class={css({ fontSize: 'sm', color: 'ink.400', mb: '10' })}>
      최종 수정일: {LAST_UPDATED}
    </p>

    <div
      class={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '10',
        color: 'ink.700',
        lineHeight: 'relaxed',
      })}
    >
      <section>
        <h2 class={heading}>1. 수집하는 정보</h2>
        <p>Frontend Lab({SITE_URL})은 다음과 같은 정보를 자동으로 수집합니다:</p>
        <ul class={bullets}>
          <li>방문 페이지 URL 및 체류 시간</li>
          <li>브라우저 종류, 운영체제, 화면 해상도</li>
          <li>대략적인 접속 지역 (국가/도시 수준)</li>
          <li>페이지 조회수 (글별 조회수 집계용)</li>
        </ul>
        <p class={css({ mt: '3' })}>
          이름, 이메일 주소 등 개인 식별 정보는 수집하지 않습니다.
        </p>
      </section>

      <section>
        <h2 class={heading}>2. 사용하는 서비스</h2>
        <div class={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
          <div>
            <h3 class={sub}>Google Analytics 4 (GA4)</h3>
            <p class={small}>
              방문자 통계 분석을 위해 Google Analytics를 사용합니다. GA4는 쿠키 및
              유사 기술을 사용하여 익명화된 방문 데이터를 수집합니다. 자세한 내용은
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                class={link}>Google 개인정보처리방침</a
              >을 참고하세요.
            </p>
          </div>
          <div>
            <h3 class={sub}>Google Tag Manager · Microsoft Clarity</h3>
            <p class={small}>
              분석 태그 관리에 Google Tag Manager를 사용하며, 이를 통해 Microsoft
              Clarity가 로드됩니다. Clarity는 사용 행태 분석(히트맵, 세션 리플레이)을
              위해 서드파티 쿠키를 사용합니다. 자세한 내용은
              <a
                href="https://privacy.microsoft.com/privacystatement"
                target="_blank"
                rel="noopener noreferrer"
                class={link}>Microsoft 개인정보처리방침</a
              >을 참고하세요.
            </p>
          </div>
          <div>
            <h3 class={sub}>Supabase</h3>
            <p class={small}>
              글별 조회수 집계에 Supabase를 사용합니다. 조회 시간과 익명 식별자만
              저장되며, 개인 식별 정보는 저장되지 않습니다.
            </p>
          </div>
          <div>
            <h3 class={sub}>Giscus (댓글)</h3>
            <p class={small}>
              댓글 기능은 GitHub Discussions 기반의 Giscus를 사용합니다. 댓글 작성 시
              GitHub 계정 정보가 사용되며, GitHub의 개인정보처리방침이 적용됩니다.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 class={heading}>3. 쿠키</h2>
        <p>이 블로그는 다음 목적으로 쿠키 및 로컬 스토리지를 사용합니다:</p>
        <ul class={bullets}>
          <li>조회수 중복 집계 방지 (6시간 쿨다운)</li>
          <li>Google Analytics 방문자 식별 (익명)</li>
          <li>Microsoft Clarity 사용 행태 분석 (서드파티 쿠키)</li>
        </ul>
        <p class={css({ mt: '3' })}>
          브라우저 설정에서 쿠키를 비활성화할 수 있으나, 일부 기능이 정상 동작하지
          않을 수 있습니다.
        </p>
      </section>

      <section>
        <h2 class={heading}>4. AI 학습 데이터 활용</h2>
        <p>
          이 블로그의 콘텐츠는 AI 학습 및 검색 인덱싱 목적의 활용을 허용합니다. 인용
          시 &quot;Sangwook Han (Frontend Lab, blog.sangwook.dev)&quot;로 출처를 표기해
          주세요.
        </p>
      </section>

      <section>
        <h2 class={heading}>5. 문의</h2>
        <p>
          개인정보 관련 문의는
          <a
            href="https://github.com/Han5991"
            target="_blank"
            rel="noopener noreferrer"
            class={link}>GitHub</a
          >
          또는
          <a
            href="https://www.linkedin.com/in/sangwook-han/"
            target="_blank"
            rel="noopener noreferrer"
            class={link}>LinkedIn</a
          >으로 연락해 주세요.
        </p>
      </section>
    </div>
  </Rail>
</div>
