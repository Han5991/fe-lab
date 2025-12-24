---
title: 'Panda CSS 1년 사용기'
date: '2025-02-17'
published: true
---

# 프롤로그

> 프로젝트에서 Panda CSS를 도입해 사용해 보면서, 기존의 styled-components나 Tailwind CSS와는 다른 독특한 스타일 작성 방식을 체감할 수 있었습니다. 특히 TypeScript 기반의 타입 안전성, 빌드 타임에 CSS를 정적으로 추출하여 런타임 오버헤드를 줄이는 점, 그리고 CSS‑in‑JS 스타일 작성과 표준 CSS 문법을 모두 지원하는 유연함이 인상적이었습니다. 이번 글에서는 Panda CSS의 주요 기능, Tailwind 및 styled-components와의 차이점, 그리고 모노레포 환경에서 디자인 시스템으로 활용하는 방법에 대해 공유하고자 합니다.

---

## 1. Panda css의 주요 특징

**빌드 타임 CSS 파일 생성**

Panda CSS는 전통적인 CSS‑in‑JS 라이브러리와 달리, 런타임에 스타일을 동적으로 생성하지 않습니다. **빌드 타임에 AST 파싱과 스캐닝을 통해 소스 코드에서 유틸리티 클래스와 패턴을 추출하고, 이를 정적으로 CSS 파일로 생성합니다**.

> "유틸리티 클래스란 하나의 스타일 속성을 하나의 클래스로 정의하는 방식으로, 재사용성을 극대화하고 CSS 파일 크기를 최적화할 수 있는 접근법입니다. 빌드 타임 추출이란 애플리케이션이 실행되기 전, 코드를 분석하여 필요한 CSS만 미리 생성해놓는 기법으로, 런타임 성능을 향상시킵니다."

```typescript
// panda.config.ts
import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  // 스타일 선언이 포함된 파일의 경로를 지정
  include: ['./src/**/*.{js,jsx,ts,tsx}', './pages/**/*.{js,jsx,ts,tsx}'],

  // 제외할 파일 경로 (필요한 경우)
  exclude: [],

  // 생성된 CSS 시스템 파일의 출력 디렉토리
  outdir: 'styled-system',

  // (선택) jsxFramework 옵션을 설정하여 JSX 패턴 지원
  jsxFramework: 'react',
});
```

이 설정 파일은 Panda CSS가 프로젝트의 소스 코드를 스캔하여 사용된 스타일을 분석한 후, styled-system 폴더에 유틸리티 클래스들을 포함한 파일들을 생성하도록 합니다. 또한, 이후 생성된 CSS 파일을 앱에 import하여 사용할 수 있습니다.

예를 들어, src/index.css 파일에는 다음과 같이 작성합니다.

```css
/* src/index.css */
@layer reset, base, tokens, recipes, utilities;
```

그리고 최종적으로 애플리케이션의 최상위 파일(예: App.tsx 혹은 index.tsx)에서 생성된 CSS 파일을 import합니다.

```tsx
// src/App.tsx
import React from 'react';
import { css } from '../styled-system/css';
import './index.css';

function App() {
  return (
    <div
      className={css({
        bg: 'blue.100',
        minH: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <h1
        className={css({
          fontSize: '3xl',
          fontWeight: 'bold',
          color: 'blue.800',
        })}
      >
        Hello, Panda CSS!
      </h1>
    </div>
  );
}

export default App;
```

이처럼 초기 설정(config 작성)과 스타일 추출 과정을 거치면, 런타임에는 미리 생성된 CSS 클래스가 적용되어 성능 최적화 효과를 누릴 수 있습니다.

---

## 2. TypeScript 기반 타입 안전성

Panda CSS는 처음부터 TypeScript를 염두에 두고 설계되었습니다.

- token 설정 자동완성으로 사용이 가능 합니다.

```tsx
// config.ts
import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  theme: {
    // 👇🏻 Define your tokens here
    extend: {
      tokens: {
        colors: {
          primary: { value: '#0FEE0F' },
          secondary: { value: '#EE0F0F' },
        },
        fonts: {
          body: { value: 'system-ui, sans-serif' },
        },
      },
    },
  },
});

// App.tsx
import { css } from '../styled-system/css';

function App() {
  return (
    <p
      className={css({
        color: 'primary',
        fontFamily: 'body',
      })}
    >
      Hello World
    </p>
  );
}
```

- **Type safety** [참고 링크](https://panda-css.com/docs/concepts/writing-styles#type-safety)
  Panda CSS는 타입 안전성을 보장하며 코드를 작성할 수 있습니다.
  strictTokens 을 키게 되면

```typescript
// 지정한 토큰 이외의 값을 사용 하면 타입 에러가 발생 하고 직접 값을 입력 하고 싶으면 []을 사용하면 됩니다.

import { css } from '../styled-system/css';

css({ bg: 'red' }); // ❌ Error: "red" is not a valid token value
css({ fontSize: '123px' }); // ❌ Error: "123px" is not a valid token value

css({ bg: 'red.400' }); // ✅ Valid
css({ fontSize: '[123px]' }); // ✅ Valid, since `[123px]` is using the escape-hatch syntax
css({ content: 'abc' }); // ✅ Valid, since `content` isn't bound to a config token
```

또한 strictPropertyValues을 키게 되면

```typescript
// 아래와 같이 없는 속성에 대한 타입 체크도 해주어 개발 편의성을 올려줍니다.

css({ display: 'flex' }); // ✅ Valid
css({ display: 'block' }); // ✅ Valid

css({ display: 'abc' }); // ❌ will throw since 'abc' is not part of predefined values of 'display'
css({ pos: 'absolute123' }); // ❌ will throw since 'absolute123' is not part of predefined values of 'position'
css({ display: '[var(--btn-display)]' }); // ✅ Valid, since `[var(--btn-display)]` is using the escape-hatch syntax

css({ content: '""' }); // ✅ Valid, since `content` does not have a predefined list of values
css({ flex: '0 1' }); // ✅ Valid, since `flex` does not have a predefined list of values
```

- **Variant 관리**
  Panda CSS의 cva 함수는 variant를 정의할 때 사용 가능한 옵션들을 자동으로 타입 추론해 주어, 컴포넌트 사용 시 안정적인 값만 입력되도록 도와줍니다.

```tsx
// button.ts
import { cva } from 'styled-system/css';

const button = cva({
  base: {
    display: 'flex',
  },
  variants: {
    visual: {
      solid: { bg: 'red.200', color: 'white' },
      outline: { borderWidth: '1px', borderColor: 'red.200' },
    },
    size: {
      sm: { padding: '4', fontSize: '12px' },
      lg: { padding: '8', fontSize: '24px' },
    },
  },
});

// Button.tsx
import { button } from './button';

const Button = () => {
  return (
    <button className={button({ visual: 'solid', size: 'lg' })}>
      Click Me
    </button>
  );
};
```

이처럼 Panda CSS는 전체 스타일 API가 TypeScript 기반으로 설계되어, 코드 작성 시 타입 안전성과 자동 완성의 이점을 제공합니다.

- **CSS‑in‑JS 방식**

```tsx
import { styled } from '../styled-system/jsx';

const Button = styled('button', {
  base: {
    py: '2',
    px: '4',
    rounded: 'md',
  },
  variants: {
    variant: {
      primary: {
        bg: 'blue.500',
        color: 'white',
      },
      secondary: {
        bg: 'gray.500',
        color: 'white',
      },
    },
  },
});

const App = () => (
  <Button variant="secondary" mt="10px">
    Button
  </Button>
);
```

- **표준 CSS 문법 사용**
  네이티브 CSS 네스팅 문법(예: &:hover { ... })을 사용할 수도 있으므로, 기존 CSS 문법에 익숙한 개발자도 자연스럽게 활용할 수 있습니다.

```typescript
import { css } from '../styled-system/css';

// 표준 CSS 네스팅 방식 (native nesting 사용)
const styleWithNesting = css({
  bg: 'green.400',
  '&:hover': {
    bg: 'green.700',
  },
});
```

---

## 3. Tailwind CSS 및 기존 styled-components와의 비교

#### Tailwind CSS

- 설정 파일의 TypeScript 지원
  Tailwind는 tailwind.config.ts 파일을 통해 테마, 색상, 폰트 등 디자인 토큰을 타입 안전하게 관리할 수 있습니다. 하지만, 실제 마크업에 적용되는 유틸리티 클래스는 문자열로 작성되므로 타입 안전성이 내재되어 있지 않습니다.

- 추가 플러그인의 사용
  Tailwind는 유틸리티 클래스가 문자열로 관리되어 가독성이 안 좋아 추가적인 플러그인 사용이 강제 됩니다.
  반면 panda css는 미리 내장되어 있는 함수로 추가적인 설치 없이 사용이 가능 합니다.

```typescript
// Panda CSS의 cva 사용 예시
import { cva } from 'styled-system/css';

export const button = cva({
  base: { p: 'medium', rounded: 'md', fontWeight: 'bold' },
  variants: {
    variant: {
      primary: { bg: 'blue.500', color: 'white' },
      secondary: { bg: 'gray.200', color: 'black' },
    },
    size: {
      small: { fontSize: 'sm', p: '2' },
      large: { fontSize: 'lg', p: '4' },
    },
  },
  defaultVariants: { variant: 'primary', size: 'small' },
});
```

> 이렇게 작성하면, 빌드 타임에 위의 스타일 객체가 자동으로 분석되어 원자 CSS 클래스들이 생성되고, 타입 안전성과 테마 토큰 연동 등도 자연스럽게 지원됩니다. 즉, variant와 관련된 로직을 별도로 설치할 필요 없이 Panda CSS 내부에서 바로 사용할 수 있습니다

ex) tailwind-variants

예를 들어, tailwind-variants를 사용한 경우는 아래와 같이 작성할 수 있습니다.

```typescript
// Tailwind-Variants 사용 예시 (Tailwind CSS와 함께)
import { tv } from 'tailwind-variants';

const button = tv({
  base: 'px-4 py-2 font-bold rounded',
  variants: {
    variant: {
      primary: 'bg-blue-500 text-white',
      secondary: 'bg-gray-200 text-black',
    },
    size: {
      small: 'text-sm',
      large: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'small',
  },
});
```

> Tailwind CSS에서는 기본적으로 미리 만들어진 유틸리티 클래스를 조합하는 방식이 주를 이루지만, 위와 같이 플러그인을 도입하면 variant 시스템을 좀 더 체계적으로 관리할 수 있습니다. 다만, 이는 별도 설치 및 설정이 필요한 부분이며, Panda CSS의 cva는 처음부터 이러한 기능이 내장되어 있어 개발자가 추가 작업 없이 바로 사용할 수 있다는 점이 차별점입니다

#### styled-components

- 런타임 동적 스타일 생성
  컴포넌트가 렌더링될 때마다 동적으로 CSS를 생성하여 DOM에 삽입합니다. 이 방식은 사용이 간편하지만, 매 렌더링 시 스타일 계산이 발생하며 SSR 환경에서 하이드레이션이 필요하고 청크 파일또한 증가하게 되어 성능에 이슈가 생길 수 있습니다.

---

## 4. 모노레포 환경에서 디자인 시스템으로 활용하는 방법

예제 코드
https://github.com/omnifed/cerberus
https://github.com/cschroeter/park-ui

> Panda CSS는 다음과 같은 방식으로 모노레포 내 디자인 시스템 구성에 활용할 수 있습니다

- 공통 디자인 토큰 및 레시피 중앙 관리
  Panda CSS의 panda.config.ts 파일에서 색상, 폰트, 간격 등의 디자인 토큰을 정의하고, 이를 레시피(예: 버튼, 텍스트 등)와 패턴으로 만들어 둡니다. 이 공통 디자인 시스템을 하나의 패키지로 구성하여, 모노레포 내 여러 프로젝트에서 재사용할 수 있습니다

📦 packages
├── 📂 panda-preset
├── 📂 react
└── 📂 styled-system

```typescript
// 예시: panda.config.ts (모노레포 공통 디자인 시스템)
import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  preflight: true,
  include: ['./packages/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  outdir: 'packages/design-system/styled-system',
  theme: {
    extend: {
      tokens: {
        colors: {
          primary: { value: '#0FEE0F' },
          secondary: { value: '#EE0F0F' },
        },
        fonts: {
          body: { value: 'system-ui, sans-serif' },
        },
      },
    },
  },
  jsxFramework: 'react',
});
```

- 공유된 styled-system 패키지 생성
  위 설정에 따라 생성된 styled-system 폴더를 공통 디자인 시스템 패키지로 만들고, 각 애플리케이션에서 해당 패키지를 의존성으로 추가합니다. 이를 통해 일관된 스타일과 토큰을 쉽게 공유할 수 있습니다.

---

## 5. 1년 사용후 느낀 점

**장점**

- 높은 타입 안전성과 자동완성
  TypeScript 기반의 API 덕분에 스타일 작성 시 오타나 잘못된 값 입력을 컴파일 타임에 바로 잡을 수 있어 유지보수에 큰 도움이 되었습니다.

- 퍼포먼스 최적화
  빌드 타임에 원자 CSS로 추출되는 방식으로 런타임 오버헤드가 없으며, SSR 환경에서도 빠른 로딩 속도를 제공합니다.

- 유연한 문법 지원
  CSS‑in‑JS 객체 문법과 native CSS 네스팅 등 표준 CSS 문법을 동시에 사용할 수 있어, 기존 CSS 문법에 익숙한 개발자도 쉽게 적응할 수 있습니다.

- 모노레포 환경에 최적화된 디자인 시스템 구성
  공통 디자인 토큰과 레시피를 중앙에서 관리하고, 공유 패키지로 구성할 수 있어 여러 애플리케이션 간 일관된 스타일 유지를 도와줍니다.

**도전 과제**

- 초기 설정과 학습 곡선
  Panda CSS의 다양한 기능(레시피, 패턴, 글로벌 스타일 등)을 온전히 활용하려면 초기 설정 및 문서 숙지가 필요합니다.
  또한 클래스가 최초 빌드 시에 생성된다는 점을 염두에 두시고, 디버깅 시 주의하시기 바랍니다.

- 생태계 및 커뮤니티 확장
  Tailwind CSS나 styled-components에 비해 아직은 자료와 플러그인 생태계가 상대적으로 작은 점은 향후 개선할 부분입니다.

---

## 6. 효율적인 학습 방법

초기 학습 곡선이 있는 만큼, Panda CSS를 처음 접하시는 분들께는 cva와 CSS 함수를 활용하여 스타일을 작성하는 방법을 추천합니다. 이를 통해 기본적인 사용법을 익히고, 점차 고급 기능으로 확장하실 수 있습니다.

```tsx
// button.ts
import { cva } from '../styled-system/css';

const button = cva({
  base: {
    display: 'flex',
  },
  variants: {
    visual: {
      solid: { bg: 'red.200', color: 'white' },
      outline: { borderWidth: '1px', borderColor: 'red.200' },
    },
    size: {
      sm: { padding: '4', fontSize: '12px' },
      lg: { padding: '8', fontSize: '24px' },
    },
  },
});

// Button.tsx
import { button } from './button';

const Button = () => {
  return (
    <button className={button({ visual: 'solid', size: 'lg' })}>
      Click Me
    </button>
  );
};
```

## 7. 결론

1년 동안 Panda CSS를 사용하며, 타입 안전성을 비롯한 빌드 타임 CSS 추출, 재사용 가능한 레시피 및 패턴, 그리고 CSS‑in‑JS와 표준 CSS 문법의 유연한 혼용이라는 독특한 장점을 직접 체감할 수 있었습니다.

Tailwind CSS는 구성 파일에서는 TypeScript의 이점을 활용할 수 있으나, 실제 마크업에서 사용하는 유틸리티 클래스는 문자열 기반이어서 타입 안전성이 제한적입니다.
styled-components는 런타임 동적 스타일 생성 방식으로 편리하지만, 성능 및 SSR 측면에서 한계가 있습니다.

반면, Panda CSS는 전체 스타일링 워크플로우가 TypeScript와 긴밀하게 통합되어 있어, 대규모 프로젝트나 모노레포 환경에서 공통 디자인 시스템을 구성하고 유지보수하는 데 매우 유리합니다.

초기에는 “클래스가 미리 만들어진다”는 방식과 새로운 문법 체계가 다소 낯설게 느껴질 수 있으나, 장기적으로 보면 유지보수, 퍼포먼스, 협업 측면에서 큰 이점을 제공합니다.

특히 CSS-In-Js 문법을 좋아하는대 ssr과 성능 최적화를 챙기고 싶으신 분이라면 panda css는 좋은 대안이 될 것이라고 생각 합니다.
