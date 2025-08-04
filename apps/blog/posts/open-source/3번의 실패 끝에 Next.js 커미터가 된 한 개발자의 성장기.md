## 3번이나 도전 하게된 이유

> "띠링" 내 핸드폰에 메일 알람이 울린다.  
> **발신자: vercel/next.js**  
> [[제목] : Re:[vercel/next.js] Fix remote pattern (#80294) (PR #80428)](https://github.com/vercel/next.js/pull/80428)  
> ![img.png](next-js-pr-img.png)
>
> 아, 이건 하면 안 되는 거였구나...
>
> 새벽 2시, 빨간색 'Closed' 라벨이 붙은 내 PR을 멍하니 바라보고 있었다.  
> 잠은 이미 다 깻고, 구글링으로 찾은 "How to contribute to Next.js" 글들은 아무런 도움이 되지 않았다.
>
> **"생각보다 많이 어렵네"**
>
> 이전에는 괜히 어려운 걸 도전해서 실패했는데, 이번엔 눈에도 익고 자주 사용하는 기능이라 자신 있었다. 그런데 또 실패했다.
>
> **"다음엔 어떤걸 도전 해볼까?"**
>
> 이게 나의 두 번째 실패였다.
>
> 3개월 후, 나는 Next.js Contributors 목록에 이름을 올렸다.  
> 그 사이에 무슨 일이 있었을까?

1. [Fix segment prefetches fail with HTTP 400](https://github.com/vercel/next.js/issues/80014#issuecomment-2927911102)
   1. 내가 한 것
      1. 아무 것도 모르는 첫 next.js 기여 도전
      2. 실험적인 기능에 도전
      3. install도 제대로 못 함
      4. 필요한 테스트 코드 작성
      5. 이슈 파악을 위해 댓글 작성 및 예제 코드 탐색 -> 예상되는 문제 코드도 적혀있어 더 탐이 났음
   2. 알게 된 것
      1. e2e 테스트 코드 자체를 createNext 을 사용해서 구성한다는걸 알게 됨
      2. 내가 너무 어려운 기능에 도전 하게 됨
2. [Fix remote pattern](https://github.com/vercel/next.js/pull/80428)
   1. 내가 한 것
      1. 이번엔 좀 더 이슈 파악하기 쉬운걸로 선택 next/image 컴포넌트
      2. 이슈 파악 -> image에 쿼리스트일 와일드 카드가 안 들어감
      3. 테스트 코드 작성
   2. 알게 된 것
      1. 단위 테스트 인대 dist로 되어 있어 빌드가 필요한 테스가 있다는 것
      2. 와일드 카드 못 쓰게 하는건 예상된 동작
3. [Fix segment prefetches fail with HTTP 400](https://github.com/vercel/next.js/pull/81146)
   1. 내가 한 것
      1. 이번엔 ai와 함께 이슈 분석 및 코드 베이스 이해 시작
      2. 간단한 이슈 선정
      3. e2e 테스트 코드 작성
   2. 알게 된 것
      1. script 컴포넌트 만들 때도 일일히 하나씩 파싱 해주는 거였다.
      2. ai와 함께 분석하니 유틸 함수가 빠져있는 걸 확인
      3. 다른 옵션은 잘 쓰고 있는대 이 부분만 빠져있는 걸 확인
      4. 다른 이슈 없다 확인해도 다른게 없었음

결국 성공 했다. 다음에 또 하라고 하면? 하고 싶다 이번엔 내가 이슈를 직접 찾아서 하고 싶다.
그리고 ai와 함께 이렇게 하는거 너무 도움이 되는 거 같다.
