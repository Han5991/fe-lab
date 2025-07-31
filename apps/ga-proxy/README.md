# 🎯 GA Proxy for Velog Tracking

velog 포스팅에서 Google Analytics 추적을 위한 이미지 기반 프록시 서버입니다.

## 🚀 Quick Start

### 1. 환경 설정

```bash
# 환경변수 설정
cp .env.example .env.local

# GA4 정보 입력
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_API_SECRET=your_api_secret_here
```

### 2. 개발 서버 실행

```bash
pnpm dev
```

### 3. velog에 붙여넣기

```markdown
<!-- 포스트 맨 아래에 추가 -->
![](https://your-ga-proxy.vercel.app/api/ga-proxy?tid=velog&host=velog.io&page=%2Fposts%2Fmy-post-slug&title=My%20Post%20Title)
```

## 📊 사용법

### TypeScript 코드 생성

```typescript
import { GAProxyUtils } from './lib/ga-proxy-generator'

// 마크다운 이미지 코드 생성
const trackingCode = GAProxyUtils.generateVelogMarkdown({
  host: 'velog.io',
  page: '/posts/my-awesome-post',
  title: 'My Awesome Post'
})

console.log(trackingCode)
// ![](https://your-ga-proxy.vercel.app/api/ga-proxy?tid=velog&host=velog.io&page=%2Fposts%2Fmy-awesome-post&title=My%20Awesome%20Post)
```

### 여러 포스트 일괄 생성

```typescript
const posts = [
  { slug: 'react-hooks', title: 'React Hooks 완벽 가이드' },
  { slug: 'nextjs-deploy', title: 'Next.js 배포하기' }
]

const trackingCodes = GAProxyUtils.generateMultipleTrackingImages(posts)
```

## 🛠 API 명세

### 엔드포인트
```
GET /api/ga-proxy
```

### 파라미터
- `tid` (필수): 트래킹 식별자
- `host` (필수): 호스트 도메인 (예: velog.io)  
- `page` (필수): 페이지 경로 (예: /posts/my-post)
- `title` (선택): 페이지 제목
- `referrer` (선택): 리퍼러 URL

### 응답
- 1x1 투명 픽셀 이미지
- GA4로 페이지뷰 이벤트 전송

## 🔧 배포

### Vercel 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경변수 설정
vercel env add GA_MEASUREMENT_ID
vercel env add GA_API_SECRET
```

### 환경변수 확인
```bash
vercel env ls
```

## 📈 GA4에서 확인

1. Google Analytics 4 → 보고서 → 실시간
2. 페이지뷰 이벤트 확인
3. 페이지 제목과 URL 기록 확인

---

**Made with ❤️ for velog bloggers**
