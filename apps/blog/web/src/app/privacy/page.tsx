import { css } from '@design-system/ui-lib/css';
import { SsgoiTransition } from '@ssgoi/react';
import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: '개인정보처리방침 | Frontend Lab',
  description: 'Frontend Lab 블로그의 개인정보처리방침입니다.',
  alternates: {
    canonical: '/privacy',
  },
  robots: {
    index: false,
  },
};

const LAST_UPDATED = '2026년 3월 15일';

export default function PrivacyPage() {
  return (
    <SsgoiTransition id="/privacy">
      <div className={css({ minHeight: 'calc(100lvh - 231px)', bg: 'white' })}>
        <div
          className={css({
            maxW: '800px',
            mx: 'auto',
            px: '6',
            py: '16',
          })}
        >
          <h1
            className={css({
              fontSize: '4xl',
              fontWeight: 'extrabold',
              mb: '3',
              color: 'gray.900',
            })}
          >
            개인정보처리방침
          </h1>
          <p className={css({ fontSize: 'sm', color: 'gray.400', mb: '10' })}>
            최종 수정일: {LAST_UPDATED}
          </p>

          <div
            className={css({
              display: 'flex',
              flexDir: 'column',
              gap: '10',
              color: 'gray.700',
              lineHeight: 'relaxed',
            })}
          >
            <section>
              <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', mb: '3', color: 'gray.900' })}>
                1. 수집하는 정보
              </h2>
              <p>
                Frontend Lab({SITE_URL})은 다음과 같은 정보를 자동으로 수집합니다:
              </p>
              <ul className={css({ mt: '3', pl: '5', display: 'flex', flexDir: 'column', gap: '1' })}>
                <li>방문 페이지 URL 및 체류 시간</li>
                <li>브라우저 종류, 운영체제, 화면 해상도</li>
                <li>대략적인 접속 지역 (국가/도시 수준)</li>
                <li>페이지 조회수 (글별 조회수 집계용)</li>
              </ul>
              <p className={css({ mt: '3' })}>
                이름, 이메일 주소 등 개인 식별 정보는 수집하지 않습니다.
              </p>
            </section>

            <section>
              <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', mb: '3', color: 'gray.900' })}>
                2. 사용하는 서비스
              </h2>
              <div className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
                <div>
                  <h3 className={css({ fontWeight: 'semibold', mb: '1' })}>Google Analytics 4 (GA4)</h3>
                  <p className={css({ fontSize: 'sm' })}>
                    방문자 통계 분석을 위해 Google Analytics를 사용합니다. GA4는 쿠키 및 유사 기술을 사용하여 익명화된 방문 데이터를 수집합니다.
                    자세한 내용은{' '}
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={css({ color: 'blue.600', _hover: { color: 'blue.800' } })}
                    >
                      Google 개인정보처리방침
                    </a>
                    을 참고하세요.
                  </p>
                </div>
                <div>
                  <h3 className={css({ fontWeight: 'semibold', mb: '1' })}>Supabase</h3>
                  <p className={css({ fontSize: 'sm' })}>
                    글별 조회수 집계에 Supabase를 사용합니다. 조회 시간과 익명 식별자만 저장되며, 개인 식별 정보는 저장되지 않습니다.
                  </p>
                </div>
                <div>
                  <h3 className={css({ fontWeight: 'semibold', mb: '1' })}>Giscus (댓글)</h3>
                  <p className={css({ fontSize: 'sm' })}>
                    댓글 기능은 GitHub Discussions 기반의 Giscus를 사용합니다. 댓글 작성 시 GitHub 계정 정보가 사용되며, GitHub의 개인정보처리방침이 적용됩니다.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', mb: '3', color: 'gray.900' })}>
                3. 쿠키
              </h2>
              <p>
                이 블로그는 다음 목적으로 쿠키 및 로컬 스토리지를 사용합니다:
              </p>
              <ul className={css({ mt: '3', pl: '5', display: 'flex', flexDir: 'column', gap: '1' })}>
                <li>조회수 중복 집계 방지 (6시간 쿨다운)</li>
                <li>Google Analytics 방문자 식별 (익명)</li>
              </ul>
              <p className={css({ mt: '3' })}>
                브라우저 설정에서 쿠키를 비활성화할 수 있으나, 일부 기능이 정상 동작하지 않을 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', mb: '3', color: 'gray.900' })}>
                4. AI 학습 데이터 활용
              </h2>
              <p>
                이 블로그의 콘텐츠는 AI 학습 및 검색 인덱싱 목적의 활용을 허용합니다.
                인용 시 &quot;Sangwook Han (Frontend Lab, blog.sangwook.dev)&quot;로 출처를 표기해 주세요.
              </p>
            </section>

            <section>
              <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', mb: '3', color: 'gray.900' })}>
                5. 문의
              </h2>
              <p>
                개인정보 관련 문의는{' '}
                <a
                  href="https://github.com/Han5991"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css({ color: 'blue.600', _hover: { color: 'blue.800' } })}
                >
                  GitHub
                </a>
                {' '}또는{' '}
                <a
                  href="https://www.linkedin.com/in/sangwook-han/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css({ color: 'blue.600', _hover: { color: 'blue.800' } })}
                >
                  LinkedIn
                </a>
                으로 연락해 주세요.
              </p>
            </section>
          </div>
        </div>
      </div>
    </SsgoiTransition>
  );
}
