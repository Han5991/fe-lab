# 🖼️ 썸네일 생성 로그 및 가이드

이 문서는 블로그 포스트의 썸네일(OG Image) 생성에 사용된 AI 프롬프트와 스타일 가이드를 기록합니다.
일관된 브랜드 이미지를 유지하고, 추후 유사한 이미지를 재생성하거나 스타일을 참고할 때 사용합니다.

## 🎨 스타일 가이드 (Style Guide)

- **Design Philosophy**: Minimalist, Professional, Tech-oriented
- **Style**: Flat Design, Geometric Shapes, Soft Gradients (Blue/Purple/White/Gray)
- **Resolution**: 1200 x 630 (1.91:1 ratio)
- **Content**: 텍스트를 최소화하고(1~2단어), 주제를 추상화한 아이콘이나 도식 위주로 구성합니다. 과도한 3D 효과나 네온 사인은 지양합니다.

---

## 📝 생성 로그 (Prompt Log)

### 1. 기본 이미지 (Default OG)
- **대상**: 썸네일이 지정되지 않은 모든 글
- **파일**: `apps/blog/web/public/og-default.png`
- **프롬프트**:
  > A minimalist blog post cover image with a sleek dark blue gradient background. In the center, clear white bold text says 'FE Lab'. The design should be modern, professional, and suitable for a tech blog. Resolution 1200x630.

### 2. 타입스크립트 리팩토링 프로젝트
- **대상**: `[Typescript로 설계하는 프로젝트]/typescript-refactor-thumb.png`
- **프롬프트**:
  > A tech blog cover image featuring TypeScript logos and a visual representation of large-scale code refactoring. The design should convey safety, efficiency, and engineering excellence. Use a modern dark theme with TypeScript blue accents. High quality, 1200x630 resolution.

### 3. 결제 시스템 아키텍처
- **대상**: `아키텍처/payment-system-architecture-thumb.png`
- **프롬프트 (Final - Simple Ver.)**:
  > A minimalist, flat-design blog cover image for 'Payment System Architecture'. Simple, clean geometric shapes representing data flow or software modules. Soft blue, white, and gray color palette. No complex 3D effects or neon lights. Professional, lightweight, and easy on the eyes. High resolution 1200x630.

### 4. 번들러 시리즈 프롤로그
- **대상**: `bundler/[누가 시키지도 않았는데 라이브러리 번들러 만들기] 0. 프롤로그.md`
- **파일명**: `bundler-prologue-thumb.png`
- **프롬프트**:
  > A minimalist, flat-design blog cover image for 'JavaScript Bundler Development'. Simple geometric shapes representing multiple modules merging into one package. Soft blue, purple, and white color palette. Clean lines, abstract representation of bundling. Professional, tech-oriented. 16:9 aspect ratio.

---

## 🚀 사용 방법

새로운 글을 작성할 때 위 스타일과 유사한 프롬프트를 사용하여 이미지를 생성한 후, 마크다운 상단(Frontmatter)에 다음과 같이 추가하세요:

```yaml
---
title: '새로운 글 제목'
thumbnail: 'image-file-name.png'
---
```

생성된 이미지는 해당 마크다운 파일과 **같은 디렉토리**에 위치시켜야 합니다.
