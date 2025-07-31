# 🎯 GA Proxy for Velog Tracking

velog 포스팅에서 Google Analytics 추적을 위한 이미지 기반 프록시 서버입니다.

## 🚀 사용 방법

### 1. 환경 설정

```bash
# .env.local 파일 생성
cp .env.example .env.local

# GA4 정보 입력
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_API_SECRET=your_api_secret_here
```

### 2. GA4 설정
1. Google Analytics 4 → 관리 → 데이터 수집 및 수정 → 데이터 스트림
2. 스트림 선택 후 측정 ID 복사 (G-로 시작)
3. Measurement Protocol API 보안 비밀 → 만들기
4. API 보안 비밀 복사하여 환경변수에 설정

### 3. velog 포스팅에서 사용

#### 기본 사용법
```typescript
import { GAProxyUtils } from './lib/ga-proxy-generator'

// 마크다운 이미지 코드 생성
const trackingCode = GAProxyUtils.generateVelogMarkdown({
  host: 'velog.io',
  page: '/posts/my-awesome-post',
  title: 'My Awesome Post'
})

console.log(trackingCode)
// 출력: ![](https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%2Fposts%2Fmy-awesome-post&title=My%20Awesome%20Post)
```

#### velog에 직접 붙여넣기
```markdown
# 내 포스트 제목

포스트 내용...

<!-- 포스트 맨 아래에 추가 -->
![](https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%2Fposts%2Fmy-post-slug&title=My%20Post%20Title)
```

## 🛠 API 명세

### 엔드포인트
```
GET /api/ga-proxy
```

### 파라미터
| 파라미터 | 필수 | 설명 | 예시 |
|---------|------|------|------|
| `tid` | ✅ | 트래킹 식별자 | `velog` |
| `host` | ✅ | 호스트 도메인 | `velog.io` |
| `page` | ✅ | 페이지 경로 | `/posts/my-post` |
| `title` | ❌ | 페이지 제목 | `My Awesome Post` |
| `referrer` | ❌ | 리퍼러 URL | `https://google.com` |

### 응답
- Content-Type: `image/png`
- 1x1 투명 픽셀 이미지 반환
- GA4로 페이지뷰 이벤트 전송

## 📊 유틸리티 함수

### 단일 포스트 추적
```typescript
import { GAProxyUtils } from './lib/ga-proxy-generator'

const markdown = GAProxyUtils.generateVelogMarkdown({
  host: 'velog.io',
  page: '/posts/typescript-tips',
  title: 'TypeScript Tips and Tricks'
})
```

### 여러 포스트 일괄 생성
```typescript
const posts = [
  { slug: 'react-hooks', title: 'React Hooks 완벽 가이드' },
  { slug: 'nextjs-deploy', title: 'Next.js 배포하기' }
]

const trackingCodes = GAProxyUtils.generateMultipleTrackingImages(posts)

trackingCodes.forEach(({ slug, markdown }) => {
  console.log(`${slug}: ${markdown}`)
})
```

### URL에서 자동 생성
```typescript
const trackingImage = GAProxyUtils.generateTrackingImageFromUrl(
  'https://velog.io/posts/my-awesome-post'
)
```

## 🔍 사용 예시

### velog 포스트 예시
```markdown
# TypeScript로 설계하는 프로젝트

TypeScript를 활용한 견고한 프로젝트 설계 방법에 대해 알아보겠습니다.

## 1. 타입 설계의 중요성
...

## 2. 도메인 모델링
...

## 마무리
오늘은 TypeScript 프로젝트 설계에 대해 알아봤습니다.

<!-- 추적 이미지 (사용자에게는 보이지 않음) -->
![](https://your-blog.com/api/ga-proxy?tid=velog&host=velog.io&page=%2Fposts%2Ftypescript-project-design&title=TypeScript%EB%A1%9C%20%EC%84%A4%EA%B3%84%ED%95%98%EB%8A%94%20%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8)
```

## 🚨 주의사항

1. **환경변수 보안**: GA_API_SECRET는 절대 공개 리포지토리에 커밋하지 마세요
2. **CORS 설정**: 프로덕션 환경에서는 적절한 CORS 정책을 설정하세요
3. **Rate Limiting**: 대량 트래픽 시 Rate Limiting 추가를 고려하세요
4. **프라이버시**: 사용자 개인정보 수집 정책을 준수하세요

## 🔧 개발 및 테스트

```bash
# 개발 서버 시작
pnpm dev

# 테스트 URL
curl "http://localhost:3000/api/ga-proxy?tid=velog&host=velog.io&page=/posts/test"

# GA 실시간 보고서에서 확인
```

## 📈 GA4에서 확인하기

1. Google Analytics 4 → 보고서 → 실시간
2. 페이지뷰 이벤트 확인
3. 페이지 제목과 URL이 올바르게 기록되는지 확인

---

**Made with ❤️ for velog bloggers**