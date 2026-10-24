interface GithubIconProps {
  /** 가로·세로 px — 옆에 놓이는 lucide 아이콘의 `size`와 같은 값을 준다. */
  size: number;
}

/**
 * GitHub 마크. lucide 1.x는 브랜드 아이콘을 뺐다(`Github` export가 없다) — lucide 0.x의 `github`
 * 아이콘(ISC) 경로를 옮겨, 옆의 lucide 아이콘(RSS·검색)과 같은 24 격자·2px 선·둥근 끝으로 그린다.
 * 장식이라 숨긴다 — 접근 이름은 감싸는 링크의 `aria-label`이 준다. 상태가 없어 서버 컴포넌트로
 * 남는다(lucide 아이콘은 컨텍스트를 읽는 클라이언트 모듈이다).
 */
export const GithubIcon = ({ size }: GithubIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);
