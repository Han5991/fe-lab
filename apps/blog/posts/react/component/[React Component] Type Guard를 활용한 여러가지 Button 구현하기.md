---
title: 'Type Guard를 활용한 여러가지 Button 구현하기'
date: '2025-06-30'
published: true
slug: 'react-component-type-guard-button'
---
# [React Component] Type Guard를 활용한 여러가지 Button 구현하기

> 드디어 디자인 시스템 프로젝트가 시작되었습니다! 팀에서 가장 먼저 구현하기로 한 컴포넌트는 Button입니다. 디자인 시스템에서 Button은 특별합니다. 가장 많이 사용되고, 가장 다양한 형태를 가지며, 다른 모든 컴포넌트의 기초가 되는 컴포넌트거든요.
>
> 설렘을 안고 피그마를 열어보았습니다.
>
> **[나]**: "자, 어떤 버튼들이 있나 보자..."
>
> 피그마를 살펴보니 생각보다 복잡합니다:
>
> - **Solid Button**: primary, secondary, assistive, white (4가지)
> - **Outlined Button**: primary, secondary, white (3가지)
> - **Text Button**: primary (1가지)
>
> **[나]**: "어? 각 스타일마다 지원하는 variant가 다르네?"
>
> 자세히 보니 더 복잡합니다:
>
> - `assistive`는 접근성을 위한 색상이라 solid에만 있음
> - `text` 버튼은 보조적 역할이라 primary만 제공
> - 각 스타일마다 다른 interaction 효과 적용
>
> **[나]**: "이거... 어떻게 구현하지? 🤔"
>
> 순간 머릿속에서 이런 생각이 스쳐갑니다. "단순하게 하나의 Button 컴포넌트로 만들면 될 줄 알았는데, 타입 안정성은 어떻게 확보하지?"

## 1부: 문제 상황과 요구사항 분석

### 🎯 처음 생각한 단순한 접근

처음엔 간단할 것 같았습니다. 하나의 Button 컴포넌트에 모든 스타일을 때려넣으면 되겠다고 생각했거든요.

```tsx
// 처음에 생각한 방식 (문제가 많음)
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'assistive' | 'white';
  size?: 'large' | 'medium' | 'small';
  disabled?: boolean;
  loading?: boolean;
}

const Button = (props: ButtonProps) => {
  // 모든 조합을 if문으로 처리...? 🤔
  // 근데 어떻게 solid/outlined/text를 구분하지?
  return <button>{props.children}</button>;
};
```

### 🚨 문제점 발견

피그마를 분석하고 실제로 구현하려고 하니까 문제가 보였습니다.

> **[나]**: "잠깐, 이거 어떻게 구현하지? outlined 버튼에 assistive variant는 없는데 이걸 어떻게 타입으로 표현할까?"
>
> **[동료]**: "그냥 모든 variant를 다 허용하고 런타임에 체크하면 안 돼?"
>
> **[나]**: "그럼 컴파일 타임에 에러를 잡을 수 없잖아. 개발자가 실수로 text 버튼에 secondary variant 넣어도 TypeScript가 막지 못해."

이때 깨달은 문제점들

1. **타입 구분 불가**: `solid` / `outlined` / `text` 버튼을 어떻게 구분할지 애매함
2. **디자인 규칙 위반 가능**: `text` 버튼에 `secondary`, `variant` 같은 잘못된 조합 허용
3. **TypeScript가 도움 안 됨**: 무의미한 조합을 컴파일 타임에 잡아내지 못함
4. **코드 복잡성**: 모든 조합을 `if문`으로 처리하면 가독성이 떨어짐
5. **확장성 부족**: 새로운 버튼 스타일 추가할 때마다 기존 코드 수정 필요

> **[동료]**: "이런 식으로 하면 나중에 디자이너가 의도하지 않은 조합으로 버튼을 만들 수도 있겠네..."
>
> **[나]**: "맞아, 디자인 시스템의 의미가 없어지겠어. 어떻게 해야 할까?"
>
> **[시니어]**: "Union Type이랑 Type Guard 써봐. 깔끔하게 해결돼."

## 2부: Union Type과 Discriminated Union 활용

### 🎨 Discriminated Union 패턴

**TypeScript의 Discriminated Union을 사용하면 각 타입별로 다른 프롭스를 강제할 수 있습니다.**

**[시니어]**: "핵심은 `frame`이라는 discriminator 속성을 추가하는 거야. 이게 타입을 구분하는 기준이 되지."

```typescript
// 각 버튼 타입별로 고유한 프롭스 정의
type SolidButtonProps = {
  frame: 'solid'; // 🔑 타입 구분을 위한 discriminator!
  variant?: 'primary' | 'secondary' | 'assistive' | 'white';
  size?: 'large' | 'medium' | 'small';
  // solid 버튼만의 고유 프롭스들...
};

type OutlinedButtonProps = {
  frame: 'outlined';
  variant?: 'primary' | 'secondary' | 'white'; // assistive는 없음!
  size?: 'large' | 'medium' | 'small';
  // outlined 버튼만의 고유 프롭스들...
};

type TextButtonProps = {
  frame: 'text';
  variant?: 'primary'; // primary만 허용!
  size?: 'large' | 'medium' | 'small';
  // text 버튼만의 고유 프롭스들...
};

// Union Type으로 결합
type ButtonProps = SolidButtonProps | OutlinedButtonProps | TextButtonProps;
```

### 🔍 Type Guard와 Type Narrowing

이제 `frame` 속성을 discriminator로 사용해서 타입을 구분할 수 있습니다.

```tsx
const Button = (props: ButtonProps) => {
  // TypeScript가 여기서 타입을 자동으로 narrowing!
  if (props.frame === 'outlined') {
    return <OutlinedButton {...props} />; // props는 OutlinedButtonProps 타입
  }

  if (props.frame === 'text') {
    return <TextButton {...props} />; // props는 TextButtonProps 타입
  }

  return <SolidButton {...props} />; // props는 SolidButtonProps 타입
};
```

### 💡 TypeScript가 타입을 구분하는 원리

> **[동료]**: "어떻게 TypeScript가 알아서 타입을 구분하는 거야?"
>
> **[시니어]**: "Discriminated Union의 핵심은 **Type Narrowing**이야. TypeScript가 조건문을 보고 타입을 좁혀나가는 거지."

```typescript
// 🔍 Type Narrowing 과정 분석
function analyzeButton(props: ButtonProps) {
  // 1️⃣ 처음에는 ButtonProps (Union Type)
  console.log(props); // SolidButtonProps | OutlinedButtonProps | TextButtonProps

  if (props.frame === 'outlined') {
    // 2️⃣ 여기서는 OutlinedButtonProps로 narrowing
    console.log(props.variant); // 'primary' | 'secondary' | 'white' 만 가능
    // props.variant = 'assistive'; // ❌ 컴파일 에러!
  }

  if (props.frame === 'text') {
    // 3️⃣ 여기서는 TextButtonProps로 narrowing
    console.log(props.variant); // 'primary' 만 가능
    // props.variant = 'secondary'; // ❌ 컴파일 에러!
  }
}
```

> **[동료]**: "오, 이렇게 하면 TypeScript가 알아서 타입 체크해주네!"
>
> **[나]**: "맞아! text 버튼에 secondary variant 넣으려고 하면 컴파일 에러가 뜨거든."

## 2.5부: 개방-폐쇄 원칙과 설계 철학

### 🏗️ 개방-폐쇄 원칙이란?

잠깐, 여기서 **시니어 개발자**가 끼어듭니다.

> **[시니어]**: "잠깐, 이 설계가 왜 좋은지 알아? 개방-폐쇄 원칙을 완벽하게 따르고 있거든."
>
> **[나]**: "개방-폐쇄 원칙이요?"
>
> **[시니어]**: "확장에는 열려있고, 수정에는 닫혀있어야 한다는 거야. 새로운 기능을 추가할 때 기존 코드를 건드리지 않아도 된다는 뜻이지."

### 🔄 기존 방식 vs 새로운 방식

**기존 방식 (수정에 열려있음 - 나쁨)**:

```tsx
// 😵 모든 로직이 한 곳에 몰려있음
const Button = (props: ButtonProps) => {
  if (props.frame === 'solid') {
    if (props.variant === 'primary') {
      // solid primary 로직
    } else if (props.variant === 'secondary') {
      // solid secondary 로직
    }
    // ... 더 많은 if문들
  } else if (props.frame === 'outlined') {
    // outlined 로직들...
  }
  // 새로운 버튼 타입 추가 시 => 여기를 수정해야 함!
};
```

**새로운 방식 (확장에 열려있음 - 좋음)**:

```tsx
// 🎉 각 타입이 독립적으로 존재
const Button = (props: ButtonProps) => {
  if (props.frame === 'outlined') {
    return <OutlinedButton {...props} />;
  }

  if (props.frame === 'text') {
    return <TextButton {...props} />;
  }

  // 새로운 버튼 타입 추가 시 => 여기에 if문 하나만 추가!
  if (props.frame === 'ghost') {
    return <GhostButton {...props} />;
  }

  return <SolidButton {...props} />;
};
```

### 💡 실무에서의 장점

> **[동료]**: "이게 실무에서 어떤 장점이 있는데?"
>
> **[시니어]**: "팀 협업할 때 엄청난 차이가 나. 예를 들어봐:"

#### 1️⃣ 충돌 최소화

> 😵 기존 방식: 모든 개발자가 같은 파일 수정
> A 개발자: solid 버튼 수정 중
> B 개발자: outlined 버튼 수정 중
> => Git merge conflict 발생!
> 🎉 새로운 방식: 각자 다른 파일 수정
> A 개발자: Solid/index.tsx 수정
> B 개발자: Outlined/index.tsx 수정
> => 충돌 없음!

#### 2️⃣ 버그 영향 범위 제한

> 😵 기존 방식: outlined 버튼 수정 => solid 버튼에도 영향 가능
> 🎉 새로운 방식: outlined 버튼 수정 => outlined 버튼에만 영향

#### 3️⃣ 테스트 코드 작성 용이성

```typescript
// 🎉 각 버튼 타입별로 독립적인 테스트
describe('SolidButton', () => {
  it('should render solid button correctly', () => {
    // solid 버튼만 테스트
  });
});

describe('OutlinedButton', () => {
  it('should render outlined button correctly', () => {
    // outlined 버튼만 테스트
  });
});
```

### 🚀 새로운 버튼 타입 추가 시나리오

> **[디자이너]**: "이제 `ghost` 버튼도 추가해야 할 것 같아요!"

**기존 방식**

> 😵 기존 Button 컴포넌트 수정 (위험!)  
> 기존 로직 망가뜨릴 위험 + 테스트 다시 해야 함

**새로운 방식**

🎉 새로운 파일만 추가

> 1. Ghost/index.tsx 생성
> 2. GhostButtonProps 타입 추가
> 3. ButtonProps Union에 추가
> 4. 메인 Button에 if문 하나만 추가 => 기존 코드 안전함!

> **[나]**: "와, 이렇게 보니까 정말 확장에는 열려있고 수정에는 닫혀있네요!"
>
> **[시니어]**: "그렇지. 이게 바로 좋은 설계야. 처음에 조금 더 생각해서 설계하면 나중에 유지보수가 엄청 편해져."

### 🎯 설계 철학: 단기 vs 장기 관점

> **[시니어]**: "많은 개발자들이 놓치는 게 있어. 단기적으로는 하나의 거대한 컴포넌트가 더 빨라 보여. 하지만 장기적으로는..."

| 관점          | 하나의 거대한 컴포넌트 | 분리된 컴포넌트 설계 |
| ------------- | ---------------------- | -------------------- |
| **개발 초기** | 빠름 🏃‍♂️                | 느림 🐌              |
| **기능 추가** | 점점 느려짐 🐌         | 일정함 🏃‍♂️            |
| **버그 수정** | 영향 범위 불명확 😵    | 영향 범위 명확 🎯    |
| **팀 협업**   | 충돌 빈번 💥           | 충돌 최소 ✅         |
| **테스트**    | 복잡함 🤯              | 단순함 😊            |

> **[나]**: "아, 그래서 처음에 조금 더 시간을 투자해서 설계하는 게 중요하구나."
>
> **[시니어]**: "맞아. 이게 바로 '느리게 가면 빠르게 간다'는 얘기야."

## 3부: 실제 구현 코드 분석

### 📁 실제 프로젝트 구조

실제로 구현된 코드를 보면 더 정교합니다:

```
📁 packages/design/ui/src/components/Button/
├── 📁 Solid/
│   ├── index.tsx
│   └── solid.recipe.ts
├── 📁 Outlined/
│   ├── index.tsx
│   └── outlined.recipe.ts
├── 📁 Text/
│   ├── index.tsx
│   └── text.recipe.ts
├── index.tsx          # 메인 Button 컴포넌트
├── types.ts           # 공통 타입 정의
├── styles.ts          # 공통 스타일
└── button.stories.tsx # Storybook 설정
```

### 🧩 메인 Button 컴포넌트

```tsx
// 📁 index.tsx
export type ButtonProps =
  | SolidButtonProps
  | OutlinedButtonProps
  | TextButtonProps;

const Button = (props: ButtonProps) => {
  // 🎯 Type Guard 패턴
  if (props.frame === 'outlined') {
    return <OutlinedButton {...props} />;
  }

  if (props.frame === 'text') {
    return <TextButton {...props} />;
  }

  return <SolidButton {...props} />;
};
```

### 🎨 개별 버튼 컴포넌트

각 버튼 컴포넌트는 고유한 타입을 가집니다:

```tsx
// 📁 Solid/index.tsx
export type SolidButtonProps = SolidButtonRecipeVariantProps &
  TBaseButton & {
    frame: 'solid';
  };

const SolidButton = ({
  className,
  rightIconName,
  leftIconName,
  fullWidth,
  ...restProps
}: SolidButtonProps) => {
  const [variantProps, localProps] = buttonRecipe.splitVariantProps(restProps);

  // 🎯 solid 버튼만의 고유 로직
  const LeftIcon = leftIconName ? Icon[leftIconName] : null;
  const RightIcon = rightIconName ? Icon[rightIconName] : null;
  const iconColorValue = token(
    `colors.${buttonRecipe.raw(variantProps).color}` as Token,
  );
  const disabled = localProps?.loading || variantProps.disabled;

  return (
    <Button
      fullWidth={fullWidth}
      disabled={disabled}
      style={overlayColor}
      classNames={{
        root: cx(
          buttonRecipe({ ...variantProps, disabled }),
          overlay,
          className,
        ),
        // 기타 스타일링...
      }}
      leftSection={LeftIcon ? <LeftIcon fill={iconColorValue} /> : null}
      rightSection={RightIcon ? <RightIcon fill={iconColorValue} /> : null}
      {...localProps}
    />
  );
};
```

### 🔧 공통 타입 정의

```typescript
// 📁 types.ts
export type TBaseButton = ComponentPropsWithRef<'button'> & {
  leftIconName?: SvgNames;
  rightIconName?: SvgNames;
  fullWidth?: boolean;
  loading?: boolean;
};
```

> **[나]**: "이렇게 하니까 각 버튼 타입마다 고유한 로직을 깔끔하게 분리할 수 있네!"
>
> **[시니어]**: "맞아. 그리고 새로운 버튼 타입 추가할 때도 기존 코드 건드릴 필요 없이 확장할 수 있어."

## 4부: 확장성과 유지보수성

### 🚀 새로운 버튼 타입 추가하기

만약 `ghost` 버튼이 추가된다면?

```tsx
// 1️⃣ 새로운 타입 정의
type GhostButtonProps = {
  frame: 'ghost';
  variant?: 'primary' | 'danger';
  size?: 'medium' | 'small';
} & TBaseButton;

// 2️⃣ Union Type에 추가
type ButtonProps =
  | SolidButtonProps
  | OutlinedButtonProps
  | TextButtonProps
  | GhostButtonProps; // 새로 추가!

// 3️⃣ 메인 컴포넌트 수정
const Button = (props: ButtonProps) => {
  const { frame } = props;

  if (frame === 'outlined') {
    return <OutlinedButton {...props} />;
  }

  if (frame === 'text') {
    return <TextButton {...props} />;
  }

  if (frame === 'ghost') {
    return <GhostButton {...props} />; // 새로 추가!
  }

  return <SolidButton {...props} />;
};
```

### ✅ 타입 안정성 체크

```tsx
// ✅ 올바른 사용
<Button frame="text" variant="primary">텍스트 버튼</Button>

// ❌ 컴파일 에러: text 버튼에 secondary variant 사용 불가
<Button frame="text" variant="secondary">에러!</Button>

// ❌ 컴파일 에러: frame 속성 누락
<Button variant="primary">에러!</Button>
```

> **[디자이너]**: "오, 이제 정말 안전하게 사용할 수 있겠네요! 개발자들이 실수할 일이 없어보여요."
>
> **[나]**: "네, 그리고 새로운 버튼 스타일 추가할 때도 기존 코드 건드릴 필요 없이 확장할 수 있어요."

## 정리하며 🎉

### Keep (잘한 점)

- **타입 안정성**: 각 버튼 타입별로 올바른 프롭스만 허용
- **확장성**: 새로운 버튼 타입 추가 시 기존 코드 수정 최소화
- **가독성**: 각 버튼 타입별 로직이 명확하게 분리됨
- **유지보수성**: 개별 버튼 컴포넌트 수정이 다른 타입에 영향 없음

### Problem (아쉬운 점)

- **초기 설계 비용**: 단순한 버튼보다 설계 시간이 더 걸림
- **코드량 증가**: 각 타입별 컴포넌트 파일이 늘어남
- **학습 곡선**: 팀원들이 Discriminated Union 패턴을 이해해야 함

### Try (다음에 시도해볼 것)

- **제네릭 활용**: 공통 로직을 더 효율적으로 재사용하는 방법
- **Builder 패턴**: 복잡한 버튼 조합을 더 직관적으로 생성하는 방법
- **런타임 검증**: 개발 모드에서 잘못된 프롭스 조합 경고하는 기능

---

이제 디자이너가 "이 버튼 타입에 이 variant는 안 되나요?"라고 물어봐도 당당하게 대답할 수 있습니다:

> **[나]**: "안 됩니다! TypeScript가 막아줄 거예요!" 🚀

---

_이 글이 도움이 되셨다면 팀에서 Type Guard 패턴을 적용해보세요! 초기 설계 비용은 있지만, 장기적으로 유지보수성과 안정성이 크게 향상됩니다._
