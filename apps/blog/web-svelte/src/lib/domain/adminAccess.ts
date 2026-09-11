import { matchesAdminEmail } from '$lib/shared/adminEmail';

/**
 * 관리자 이메일 — **이 모듈 안에만 둔다.**
 *
 * 시크릿이 아니다: 클라이언트에서 판정하므로 어차피 번들에 실린다. 실제 강제는
 * Edge Function `admin-analytics`가 호출자 JWT를 별개의 진짜 시크릿 `ADMIN_EMAIL`과
 * 대조하며 한다(`apps/blog/web/.env.production` 주석과 같은 판단).
 *
 * ## 왜 env도 값 모듈도 아닌가 — **청킹은 모듈 단위다**
 *
 * 처음에는 `$env/static/public`에서 읽었다. 그랬더니 이 주소가 **글 페이지 첫
 * 로드 청크에 평문으로** 실렸다 — 공개 페이지가 같은 가상 모듈에서 Supabase
 * URL·키를 읽기 때문이다. `@blog/site-values`로 옮겨도 똑같았다: 글 페이지가
 * `GISCUS`를 그 모듈에서 읽으므로 모듈 전체가 그 청크에 있고, 번들러는 **쓰이는
 * export를 모듈 밖으로 옮겨 주지 않는다.** 트리셰이킹은 아무도 안 쓰는 export를
 * 지우는 일이지, 소비자별로 청크를 나누는 일이 아니다.
 *
 * 그래서 값을 **admin만 여는 모듈**에 둔다. 이 파일을 여는 곳은 admin 레이아웃
 * 하나이고, `check-bundle`의 규칙이 그 상태를 잠근다 — 공개 페이지 첫 로드에
 * 이 주소가 나타나면 빌드가 실패한다.
 *
 * `apps/blog/web`은 아직 `NEXT_PUBLIC_ADMIN_EMAIL`을 읽는다. 값이 두 곳에 있는
 * 상태이고(Giscus 좌표와 같다), 합치는 것은 그쪽 CI·배포 배선을 함께 보는 일이다.
 */
const ADMIN_EMAIL = 'rewq5991@gmail.com';

/**
 * 이 배포에서 관리자인가 — 값과 판정(`matchesAdminEmail`)을 묶는다.
 * 판정 자체가 옆 파일에 있는 이유는 테스트다(그 파일 주석).
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return matchesAdminEmail(email, ADMIN_EMAIL);
}
