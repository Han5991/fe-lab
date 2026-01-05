---
title: "2026 번들러 트렌드 요약 (Vite+Rolldown, Turbopack, Rspack)"
date: "2026-01-05"
tags: ["bundler", "trend", "rust"]
---

# 2026 번들러 트렌드 요약: 3강 체제의 이해

이 문서는 "나만의 번들러 만들기" 시리즈를 작성하며 정리한 최신 번들러 트렌드 요약본입니다. 현재 프론트엔드 빌드 도구 시장은 **Rust**를 기반으로 한 성능 혁신을 중심으로 3파전 양상을 보이고 있습니다.

## 1. Vite + Rolldown (The New Standard)
*   **정체성:** "Rollup의 후계자 + Rust의 성능"
*   **목표:** 프론트엔드 툴체인의 **천하통일 (App + Library / Dev + Prod)**
*   **핵심 변화:**
    *   기존 Vite의 이중 구조(Dev: esbuild, Prod: Rollup)를 **Rolldown** 하나로 통합.
    *   앱 개발뿐만 아니라 **라이브러리 번들링**에서도 강력한 성능과 편의성 제공 (기존 `tsup` 등의 수요 흡수).
*   **강점:** 압도적인 생태계(Vue, Svelte, React SPA 등)와 범용성.
*   **의의:** 우리가 공부하는 **ESM First** 철학을 가장 잘 계승하고 있는 모델.

## 2. Turbopack (The Challenger / Future Webpack)
*   **정체성:** "Webpack 창시자(Tobias Koppers)가 만든 Rust 기반의 차세대 번들러"
*   **목표:** **Webpack의 진정한 계승자**이자 Next.js의 전용 엔진.
*   **핵심 특징:**
    *   **Incremental Computation (증분 계산):** 파일 변경 시 영향받는 최소한의 부분만 재계산하는 아키텍처. 이론적으로 프로젝트가 커질수록 Vite보다 빠름.
    *   현재는 **Next.js** 생태계에 최적화되어 있음.
*   **경쟁 구도:** Vite 진영 vs Next.js(Vercel) 진영의 대리전 양상.

## 3. Rspack (The Pragmatist)
*   **정체성:** "Webpack 설정을 그대로 쓰는 Rust 번들러"
*   **목표:** **레거시 Webpack 프로젝트의 구원투수.**
*   **핵심 특징:**
    *   Webpack의 설정과 플러그인 생태계를 거의 그대로 지원하면서 속도만 Rust급으로 향상.
    *   ByteDance 주도로 개발됨.
*   **타겟:** Webpack에서 벗어나고 싶지만, 마이그레이션 비용이 너무 커서 엄두를 못 내는 **대규모 엔터프라이즈** 프로젝트.

## 결론: 왜 지금 번들러를 직접 만들어보는가?
이 모든 최신 도구들(Rolldown, Turbopack, Rspack)의 공통점은 **"JavaScript/TypeScript 코드를 파싱(AST)하고, 의존성 그래프(Graph)를 그려서, 하나로 합친다(Bundle)"**는 본질적인 원리를 공유한다는 점입니다. 단지 그 도구가 JS에서 Rust로 바뀌었을 뿐입니다.

따라서 이 시리즈를 통해 JS로 번들러의 **핵심 원리(Core Principles)**를 이해하는 것은, 단순히 장난감(Toy)을 만드는 것이 아니라 **미래의 도구들이 어떻게 동작하는지 꿰뚫어 보는 통찰력**을 기르는 과정입니다.
