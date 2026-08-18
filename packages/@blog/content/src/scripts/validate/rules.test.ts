/**
 * 규칙 평면 테이블(rules.ts)의 계약을 잠급니다.
 *
 * 이 테스트는 일부러 change-detector입니다 — 규칙을 추가·삭제하면 여기 목록도
 * 고쳐야 합니다. 그게 의도입니다: "규칙이 몇 개고 무엇이 승격되는지"가 코드
 * 통독이 아니라 테이블+이 목록으로 답해지는 상태를 유지합니다.
 */
import { expect, test } from 'vitest';
import { RULES, SEO_PUBLISH, resolveSeverity, type RuleId } from './rules.ts';

test('RULES: 규칙은 정확히 29개', () => {
  // `non-string-field`가 세다 보면 흔히 빠진다 — 개수를 고정해 추가·삭제가
  // 테이블을 지나치지 못하게 한다.
  expect(Object.keys(RULES).length).toBe(29);
});

test('RULES: --strict 승격(SEO_PUBLISH) 센티널은 정확히 6개', () => {
  // 루트 CLAUDE.md의 prebuild 설명("경고로 두는 SEO 규칙 6개를 빌드 직전에는
  // 에러로 올린다")과 같은 집합이어야 한다.
  const promoted = Object.entries(RULES)
    .filter(([, spec]) => spec.severity === SEO_PUBLISH)
    .map(([id]) => id)
    .sort();
  expect(promoted).toStrictEqual([
    'duplicate-description',
    'excerpt-length',
    'long-title',
    'missing-excerpt',
    'missing-image-alt',
    'truncated-excerpt',
  ]);
});

test('RULES: 전체 집합을 봐야 하는 규칙은 corpus 계열 scope 둘뿐', () => {
  const corpusRules = Object.entries(RULES)
    .filter(
      ([, spec]) => spec.scope === 'corpus' || spec.scope === 'corpusVisible',
    )
    .map(([id]) => id)
    .sort();
  expect(corpusRules).toStrictEqual([
    'duplicate-description',
    'duplicate-slug',
  ]);
  // 가시성 필터까지 걸리는 쪽은 duplicate-description이다 — 공개 전 예약 글을
  // 비교에 섞으면 산출물에 없는 충돌로 빌드가 막힌다(corpus.ts 참고).
  expect(RULES['duplicate-description'].scope).toBe('corpusVisible');
  expect(RULES['duplicate-slug'].scope).toBe('corpus');
});

test('RULES: isPostFile 게이트(scope=post)가 걸린 규칙', () => {
  // 메타 노트는 렌더될 일이 없어 검사하지 않는 규칙들 — body.ts의 두 검사.
  const postScoped = Object.entries(RULES)
    .filter(([, spec]) => spec.scope === 'post')
    .map(([id]) => id)
    .sort();
  expect(postScoped).toStrictEqual(['body-h1', 'missing-image-alt']);
});

// ── resolveSeverity: 승격 조건은 check-seo가 보는 범위와 같다 ────────────────

const PUBLISHED = { title: 'x', status: 'published', date: '2020-01-01' };

test('resolveSeverity: 센티널 규칙은 strict + 발행 대상일 때만 에러', () => {
  const rule: RuleId = 'missing-excerpt';
  // strict가 아니면 발행 글도 경고 (predev/lint:posts가 이 경로)
  expect(resolveSeverity(rule, PUBLISHED, {})).toBe('warning');
  // strict + 발행 → 에러
  expect(resolveSeverity(rule, PUBLISHED, { strict: true })).toBe('error');
  // strict라도 draft는 경고 — 빌드에서 빠지므로 check-seo가 볼 일이 없다
  expect(
    resolveSeverity(rule, { ...PUBLISHED, status: 'draft' }, { strict: true }),
  ).toBe('warning');
  // status가 아예 없는 메타 노트는 발행 대상이 아니다
  expect(resolveSeverity(rule, { title: 'x' }, { strict: true })).toBe(
    'warning',
  );
});

test('resolveSeverity: 공개 전 예약 글은 strict라도 경고, 공개일이 지나면 에러', () => {
  const rule: RuleId = 'missing-excerpt';
  expect(
    resolveSeverity(
      rule,
      { title: 'x', status: 'scheduled', date: '2999-12-01' },
      { strict: true },
    ),
  ).toBe('warning');
  expect(
    resolveSeverity(
      rule,
      { title: 'x', status: 'scheduled', date: '2020-01-01' },
      { strict: true },
    ),
  ).toBe('error');
});

test('resolveSeverity: 무따옴표 date(YAML Date 객체)도 공개 판정에 쓰인다', () => {
  // isPostVisible은 문자열 날짜만 인정한다. 원문 Date 객체를 정규화 없이 넘기면
  // 이미 공개된 예약 글이 "비공개"로 판정돼 에러가 조용히 경고로 떨어진다.
  const rule: RuleId = 'missing-excerpt';
  expect(
    resolveSeverity(
      rule,
      { title: 'x', status: 'scheduled', date: new Date('2020-01-01') },
      { strict: true },
    ),
  ).toBe('error');
});

test('resolveSeverity: 고정 심각도 규칙은 strict와 무관하게 테이블 값 그대로', () => {
  expect(resolveSeverity('missing-title', PUBLISHED, {})).toBe('error');
  expect(
    resolveSeverity('missing-title', { title: 'x' }, { strict: true }),
  ).toBe('error');
  expect(resolveSeverity('duplicate-tags', PUBLISHED, {})).toBe('warning');
  expect(resolveSeverity('duplicate-tags', PUBLISHED, { strict: true })).toBe(
    'warning',
  );
});
