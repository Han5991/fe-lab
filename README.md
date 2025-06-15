# 🧪 FE Lab

> **프론트엔드 기술 탐구와 실무 적용을 위한 실험실**

다양한 프론트엔드 기술을 탐구하고, 실무에서 바로 적용할 수 있는 설계 패턴과 아키텍처를 연구하는 Turborepo 기반 모노레포입니다.

## 📋 **프로젝트 개요**

이 프로젝트는 **실무 중심의 프론트엔드 기술 연구**를 목적으로 합니다:

- **TypeScript 설계 패턴** 탐구 및 적용
- **다양한 프론트엔드 프레임워크** 비교 실험
- **디자인 시스템** 구축 및 최적화
- **실무 경험 기반 기술 블로그** 작성

---

## 🏗️ **아키텍처**

### **Monorepo 구조**

- **Turborepo**: 빌드 오케스트레이션 및 태스크 관리
- **pnpm Workspaces**: 의존성 관리 및 패키지 공유
- **TypeScript**: 모든 애플리케이션과 패키지에 타입 안전성 보장

### **핵심 철학**

- **점진적 개선**: 복잡한 아키텍처로 한번에 이주하지 않고 단계적 발전
- **실무 중심**: 이론보다는 실제 프로젝트에서 적용 가능한 패턴 우선
- **타입 안전성**: TypeScript를 활용한 컴파일 타임 오류 방지

---

## 📁 **프로젝트 구조**

### **애플리케이션** (`apps/`)

#### **🎯 실험용 애플리케이션**

- **`next.js/`**: Next.js App Router + Jest + Turbopack
  - 서버 컴포넌트, 에러 바운더리, 테스팅 전략 실험
- **`react/`**: React SPA + Vite + Vitest
  - React Router, MSW, 커스텀 훅 패턴 실험
- **`typescript/`**: Pure TypeScript 실험
  - 도메인 모델링, 타입 설계 패턴 연구

#### **📝 기술 블로그** (`blog/`)

- **TypeScript 프로젝트 설계 시리즈**

  - [도메인 모델로 복잡한 비즈니스 로직 정리하기](apps/blog/[Typescript로%20설계하는%20프로젝트]/domain/)
  - [견고한 서버 API Type 설계하기](apps/blog/[Typescript로%20설계하는%20프로젝트]/http/)
  - [Service Layer 설계 전략](apps/blog/[Typescript로%20설계하는%20프로젝트]/service/)

- **실무 경험 기반 기술 아티클**
  - [Panda CSS 1년 사용기](apps/blog/Panda%20CSS%201년%20사용기.md)
  - [pnpm 10 업그레이드 이슈 해결](apps/blog/pnpm%2010%20업그레이드%20후/)
  - [Next.js 배포 및 장애 대응](apps/blog/nextjs%20deploy/)

### **공유 패키지** (`packages/`)

#### **🎨 디자인 시스템**

- **`@design-system/ui`**: 공통 컴포넌트 라이브러리
- **`@design-system/ui-lib`**: Panda CSS 기반 스타일 유틸리티

#### **🔧 핵심 유틸리티**

- **`@package/core`**: HTTP 클라이언트, 상태 코드 정의
- **`@package/config`**: 공유 TypeScript 설정

---

## 🚀 **시작하기**

### **환경 요구사항**

- **Node.js**: >= 20
- **pnpm**: 10.10.0 (패키지 매니저 고정)

### **설치 및 실행**

```bash
# 의존성 설치
pnpm install

# 모든 애플리케이션 개발 서버 실행
pnpm dev

# 특정 애플리케이션 실행
pnpm react    # React 앱 + 디자인 시스템
pnpm next     # Next.js 앱 + 디자인 시스템
pnpm typescript # TypeScript 실험 환경
```

### **테스트 및 빌드**

```bash
# 전체 테스트 실행
pnpm test

# 전체 빌드
pnpm build
```

---

## 🧪 **실험 중인 기술들**

### **프론트엔드 기술 스택**

- **스타일링**: Panda CSS (CSS-in-JS 대안)
- **테스팅**: Jest + Vitest + React Testing Library
- **상태 관리**: 커스텀 훅 + Context API
- **HTTP**: 타입 안전한 API 클라이언트

### **아키텍처 패턴**

- **도메인 주도 설계(DDD)** 개념을 프론트엔드에 적용
- **클린 아키텍처** 원칙 기반 레이어 분리
- **함수형 vs 객체지향** 하이브리드 접근

### **개발 도구**

- **Turborepo**: 모노레포 최적화
- **Panda CSS**: 성능 중심 스타일링
- **MSW**: API 모킹 및 테스트

---

## 📖 **학습 자료**

### **추천 읽기 순서**

1. [타입 설계의 시작](apps/blog/[Typescript로%20설계하는%20프로젝트]/http/) - HTTP API 타입 안전성
2. [Service Layer 설계](apps/blog/[Typescript로%20설계하는%20프로젝트]/service/) - 비즈니스 로직 분리
3. [도메인 모델링](apps/blog/[Typescript로%20설계하는%20프로젝트]/domain/) - 복잡한 로직 정리

---

> **"실무에서 바로 쓸 수 있는 프론트엔드 기술을 탐구합니다"** 🚀
