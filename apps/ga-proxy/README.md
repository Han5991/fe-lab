# 🎯 GA Proxy for Velog @rewq5991

@rewq5991 velog 포스팅에서 Google Analytics 추적을 위한 초간단 이미지 기반 프록시 서버입니다.

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

### 3. velog에 붙여넣기 (초간단!)

```markdown
<!-- 포스트 맨 아래에 추가 - 포스트 슬러그만 입력! -->
![](https://fe-lab-ga-proxy.vercel.app/api/ga-proxy?slug=react-component-toast)
```

## 📊 사용법

### 기본 사용법 (슬러그만!)

```markdown
![](https://fe-lab-ga-proxy.vercel.app/api/ga-proxy?slug=your-post-slug)
```

### 단축 파라미터

```markdown
![](https://fe-lab-ga-proxy.vercel.app/api/ga-proxy?s=your-post-slug)
```

### 실제 예시

```markdown
<!-- react-component-toast 포스트용 -->
![](https://fe-lab-ga-proxy.vercel.app/api/ga-proxy?slug=react-component-toast)

<!-- react-hooks-guide 포스트용 -->
![](https://fe-lab-ga-proxy.vercel.app/api/ga-proxy?s=react-hooks-guide)
```

## 🛠 API 명세

### 엔드포인트
```
GET /api/ga-proxy
```

### 파라미터
- `slug` (또는 `s`) (필수): 포스트 슬러그만 입력

### 자동 처리
- **고정 URL**: `https://velog.io/@rewq5991/` 자동 추가
- **제목 생성**: 슬러그에서 자동으로 제목 생성
  - `react-component-toast` → `React Component Toast`
  - `nextjs-deploy-guide` → `Nextjs Deploy Guide`

### 응답
- 1x1 투명 픽셀 이미지
- GA4로 페이지뷰 이벤트 전송

## 🔧 배포

이미 배포됨: **https://fe-lab-ga-proxy.vercel.app**

### 로컬에서 테스트
```bash
pnpm dev
# http://localhost:3000/api/ga-proxy?slug=test
```

## 📈 GA4에서 확인

1. **Google Analytics 4 → 보고서 → 실시간**
2. **페이지뷰 이벤트 확인**
3. **페이지 정보 확인**:
   - **페이지 위치**: `https://velog.io/@rewq5991/your-post-slug`
   - **페이지 제목**: 자동 생성된 제목

## 💡 사용 팁

### 포스트별 추적 코드 빠르게 만들기

1. 포스트 URL에서 슬러그 복사: `https://velog.io/@rewq5991/react-component-toast`
2. 슬러그 부분만 추출: `react-component-toast`
3. 추적 코드 생성: `![](https://fe-lab-ga-proxy.vercel.app/api/ga-proxy?s=react-component-toast)`

### 여러 포스트에 한번에 적용

```markdown
<!-- 각 포스트 맨 아래 추가 -->
![](https://fe-lab-ga-proxy.vercel.app/api/ga-proxy?s=post-slug-1)
![](https://fe-lab-ga-proxy.vercel.app/api/ga-proxy?s=post-slug-2)
![](https://fe-lab-ga-proxy.vercel.app/api/ga-proxy?s=post-slug-3)
```

---

**Made with ❤️ for @rewq5991 velog**
