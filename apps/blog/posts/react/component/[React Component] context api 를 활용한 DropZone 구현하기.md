---
title: 'Context API를 활용한 DropZone 구현하기'
date: '2025-07-30'
published: true
---
# [React Component] Context API를 활용한 DropZone 구현하기

> 평소처럼 Mantine의 Dropzone을 사용하고 있었는데, 문득 내부 구현이 궁금해졌습니다. 어떻게 이렇게 깔끔한 API를 제공할 수 있을까?
>
> ```tsx
> // Mantine Dropzone 사용 중...
> <Dropzone onDrop={handleDrop}>
>   <Dropzone.Idle>기본 상태</Dropzone.Idle>
>   <Dropzone.Accept>허용 상태</Dropzone.Accept>
>   <Dropzone.Reject>거부 상태</Dropzone.Reject>
> </Dropzone>
> ```
>
> 마침 그때 디자인 팀에서 연락이 왔습니다.
>
> **[디자이너]**: "파일 업로드 컴포넌트를 우리 디자인 시스템에 맞게 다시 만들어야 할 것 같아요. Mantine 스타일이 브랜드와 안 맞아서..."
>
> **[나]**: "아, 그럼 Dropzone도 자체 구현해야 하는 건가요?"
>
> **[디자이너]**: "네, 그리고 상태별로 다른 애니메이션이랑 아이콘도 써야 하고... 기본, 허용, 거부, 로딩 상태 모두 다르게 보여주세요!"

순간 두 가지 생각이 스쳐갔습니다. **"어차피 다시 만들어야 한다면, Mantine의 내부 구현을 분석해서 더 나은 방식으로 만들어보자!"**

그렇게 Mantine의 Dropzone 컴포넌트를 뜯어보다가 **Context API + 컴파운드 컴포넌트 패턴**의 놀라운 조합을 발견했습니다.

## 1부: Mantine 분석과 자체 구현의 필요성

### Mantine Dropzone 분석하기

먼저 Mantine의 Dropzone이 어떻게 동작하는지 살펴봤습니다. 정말 간단한 API로 복잡한 상태 관리를 숨기고 있더군요.

```tsx
// Mantine의 놀라운 API
<Dropzone onDrop={handleDrop}>
  <Dropzone.Idle>파일을 드래그하세요</Dropzone.Idle>
  <Dropzone.Accept>파일을 놓으세요</Dropzone.Accept>
  <Dropzone.Reject>지원하지 않는 파일입니다</Dropzone.Reject>
</Dropzone>
```

> **[나]**: "어떻게 이렇게 간단한 API로 복잡한 상태 관리를 할 수 있지?"

### 자체 구현 시 고려사항

디자인 시스템에 맞게 자체 구현하면서도 Mantine의 좋은 패턴은 그대로 가져가고 싶었습니다. 하지만 처음엔 단순하게 접근했죠.

```tsx
// 처음에 생각한 방식 (문제가 많음)
const DropZone = () => {
  const [dragState, setDragState] = useState<'idle' | 'accept' | 'reject'>(
    'idle',
  );
  const [loading, setLoading] = useState(false);

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }

    if (dragState === 'accept') {
      return (
        <div>
          <CheckIcon />
          <span>파일을 놓으세요</span>
        </div>
      );
    }

    if (dragState === 'reject') {
      return (
        <div>
          <WarningIcon />
          <span>지원하지 않는 파일 형식입니다</span>
        </div>
      );
    }

    return (
      <div>
        <UploadIcon />
        <span>파일을 드래그하거나 클릭하세요</span>
      </div>
    );
  };

  return (
    <div onDragOver={handleDragOver} onDrop={handleDrop}>
      {renderContent()}
    </div>
  );
};
```

## 2부: Context API를 활용한 컴파운드 컴포넌트 설계

### 컴파운드 컴포넌트 패턴이란?

**컴파운드 컴포넌트 패턴**은 여러 컴포넌트가 협력해서 하나의 기능을 구현하는 패턴입니다. HTML의 `<select>`와 `<option>`의 관계와 비슷해요.

```tsx
// 우리가 목표로 하는 API
<DropZone onDrop={handleDrop}>
  <DropZone.Idle
    icon="Upload"
    mainMessage="파일을 드래그하거나 클릭하세요"
    supportMessage="최대 10MB, JPG, PNG, PDF 지원"
  />
  <DropZone.Accept mainMessage="파일을 놓으세요" />
  <DropZone.Reject
    mainMessage="지원하지 않는 파일입니다"
    supportMessage="JPG, PNG, PDF만 업로드 가능합니다"
  />
</DropZone>
```

### Context API를 통한 상태 공유

**핵심 아이디어는 Context API로 DropZone의 모든 상태를 중앙 관리하고, 컴파운드 컴포넌트들이 이 상태를 구독하는 것입니다.**

```tsx
import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from 'react';

type DropzoneStatus = 'idle' | 'accept' | 'reject' | 'loading';

type DropzoneContextValue = {
  // 상태
  status: DropzoneStatus;
  files: File[];
  error: string | null;

  // 액션
  setStatus: (status: DropzoneStatus) => void;
  setFiles: (files: File[]) => void;
  setError: (error: string | null) => void;
  resetState: () => void;

  // 드래그 이벤트 핸들러
  handleDragEnter: (e: DragEvent) => void;
  handleDragLeave: (e: DragEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDrop: (e: DragEvent) => void;
};

const DropzoneContext = createContext<DropzoneContextValue | null>(null);

export const useDropzoneContext = () => {
  const context = useContext(DropzoneContext);
  if (!context) {
    throw new Error('Dropzone 컴포넌트 내에서만 사용할 수 있습니다.');
  }
  return context;
};

type DropzoneProviderProps = {
  children: ReactNode;
  onDrop?: (files: File[]) => void;
  accept?: string[];
  maxSize?: number;
};

export const DropzoneProvider = ({
  children,
  onDrop,
  accept = [],
  maxSize = 10 * 1024 * 1024, // 10MB
}: DropzoneProviderProps) => {
  const [status, setStatus] = useState<DropzoneStatus>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (fileList: File[]) => {
      const validFiles: File[] = [];
      let hasError = false;

      fileList.forEach(file => {
        // 파일 타입 검증
        if (accept.length > 0) {
          const isAccepted = accept.some(acceptType => {
            if (acceptType.endsWith('/*')) {
              return file.type.startsWith(acceptType.slice(0, -1));
            }
            return file.type === acceptType;
          });

          if (!isAccepted) {
            setError(`지원하지 않는 파일 형식입니다: ${file.name}`);
            hasError = true;
            return;
          }
        }

        // 파일 크기 검증
        if (file.size > maxSize) {
          setError(`파일 크기가 너무 큽니다: ${file.name}`);
          hasError = true;
          return;
        }

        validFiles.push(file);
      });

      return { validFiles, hasError };
    },
    [accept, maxSize],
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus('accept');
    setError(null);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus('idle');
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const droppedFiles = Array.from(e.dataTransfer?.files || []);
      const { validFiles, hasError } = validateFiles(droppedFiles);

      if (hasError) {
        setStatus('reject');
        return;
      }

      setFiles(validFiles);
      setStatus('loading');
      onDrop?.(validFiles);
    },
    [validateFiles, onDrop],
  );

  const resetState = useCallback(() => {
    setStatus('idle');
    setFiles([]);
    setError(null);
  }, []);

  const value: DropzoneContextValue = {
    status,
    files,
    error,
    setStatus,
    setFiles,
    setError,
    resetState,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };

  return (
    <DropzoneContext.Provider value={value}>
      {children}
    </DropzoneContext.Provider>
  );
};
```

### 메인 DropZone 컴포넌트 구현

```tsx
import type { ReactNode, HTMLAttributes } from 'react';
import { DropzoneProvider, useDropzoneContext } from './context';
import { Accept, Idle, Reject, Loading } from './status';
import { dropzoneContainer } from './styles';

type DropzoneProps = {
  children: ReactNode;
  onDrop?: (files: File[]) => void;
  accept?: string[];
  maxSize?: number;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'onDrop'>;

// 내부 컨테이너 컴포넌트 - Context를 사용
const DropzoneContainer = ({
  children,
  className,
  ...restProps
}: Omit<DropzoneProps, 'onDrop' | 'accept' | 'maxSize'>) => {
  const {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    status,
    error,
  } = useDropzoneContext();

  const { container } = dropzoneContainer({
    status,
    error: !!error,
  });

  return (
    <div
      className={`${container} ${className || ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      {...restProps}
    >
      {children}
    </div>
  );
};

// 메인 Dropzone 컴포넌트
const Dropzone = ({
  children,
  onDrop,
  accept,
  maxSize,
  ...containerProps
}: DropzoneProps) => {
  return (
    <DropzoneProvider onDrop={onDrop} accept={accept} maxSize={maxSize}>
      <DropzoneContainer {...containerProps}>{children}</DropzoneContainer>
    </DropzoneProvider>
  );
};

// 컴파운드 컴포넌트 연결
Dropzone.Accept = Accept;
Dropzone.Idle = Idle;
Dropzone.Reject = Reject;
Dropzone.Loading = Loading;

export default Dropzone;
```

### 각 상태별 컴포넌트 구현

#### Idle 상태 컴포넌트

```tsx
import type { ReactNode } from 'react';
import { useDropzoneContext } from '../context';
import { statusBaseClasses } from '../styles';
import Icon from '../../Icon';

type IdleProps = {
  icon?: string;
  mainMessage: ReactNode;
  supportMessage?: ReactNode;
  children?: ReactNode;
};

const Idle = ({
  mainMessage,
  supportMessage,
  icon = 'Upload',
  children,
}: IdleProps) => {
  const { status } = useDropzoneContext();

  // idle 상태일 때만 렌더링
  if (status !== 'idle') return null;

  const { container, mainText, supportText } = statusBaseClasses({
    status: 'idle',
  });
  const IconComponent = Icon[icon as keyof typeof Icon];

  return (
    <div className={container}>
      {children || (
        <>
          <IconComponent className="dropzone-icon" />
          <span className={mainText}>{mainMessage}</span>
          {supportMessage && (
            <span className={supportText}>{supportMessage}</span>
          )}
        </>
      )}
    </div>
  );
};

export default Idle;
```

#### Accept 상태 컴포넌트

```tsx
import type { ReactNode } from 'react';
import { useDropzoneContext } from '../context';
import { statusBaseClasses } from '../styles';
import Icon from '../../Icon';

type AcceptProps = {
  mainMessage: ReactNode;
  children?: ReactNode;
};

const Accept = ({ mainMessage, children }: AcceptProps) => {
  const { status } = useDropzoneContext();

  // accept 상태일 때만 렌더링
  if (status !== 'accept') return null;

  const { container, mainText } = statusBaseClasses({ status: 'accept' });

  return (
    <div className={container}>
      {children || (
        <>
          <Icon.CircleCheckFill className="dropzone-icon" />
          <span className={mainText}>{mainMessage}</span>
        </>
      )}
    </div>
  );
};

export default Accept;
```

#### Reject 상태 컴포넌트

```tsx
import type { ReactNode } from 'react';
import { useDropzoneContext } from '../context';
import { statusBaseClasses } from '../styles';
import Icon from '../../Icon';

type RejectProps = {
  mainMessage: ReactNode;
  supportMessage?: ReactNode;
  children?: ReactNode;
};

const Reject = ({ mainMessage, supportMessage, children }: RejectProps) => {
  const { status, error } = useDropzoneContext();

  // reject 상태일 때만 렌더링
  if (status !== 'reject') return null;

  const { container, mainText, supportText } = statusBaseClasses({
    status: 'reject',
  });

  return (
    <div className={container}>
      {children || (
        <>
          <Icon.CircleWarningFill className="dropzone-icon" />
          <span className={mainText}>{error || mainMessage}</span>
          {supportMessage && (
            <span className={supportText}>{supportMessage}</span>
          )}
        </>
      )}
    </div>
  );
};

export default Reject;
```

#### Loading 상태 컴포넌트

```tsx
import type { ReactNode } from 'react';
import { useDropzoneContext } from '../context';
import { statusBaseClasses } from '../styles';
import Loader from '../../Loader';

type LoadingProps = {
  mainMessage: ReactNode;
  supportMessage?: ReactNode;
  children?: ReactNode;
};

const Loading = ({ mainMessage, supportMessage, children }: LoadingProps) => {
  const { status } = useDropzoneContext();

  // loading 상태일 때만 렌더링
  if (status !== 'loading') return null;

  const { container, mainText, supportText } = statusBaseClasses({
    status: 'loading',
  });

  return (
    <div className={container}>
      {children || (
        <>
          <Loader />
          <span className={mainText}>{mainMessage}</span>
          {supportMessage && (
            <span className={supportText}>{supportMessage}</span>
          )}
        </>
      )}
    </div>
  );
};

export default Loading;
```

### Context API + 컴파운드 컴포넌트의 핵심 패턴

여기서 **가장 중요한 패턴**은 각 컴포넌트가 Context를 구독해서 **자신이 렌더링될 조건을 스스로 판단한다는 것**입니다.

```tsx
// 🎯 핵심 패턴: 조건부 렌더링의 분산
const Idle = ({ mainMessage, supportMessage }: IdleProps) => {
  const { status } = useDropzoneContext(); // Context 구독

  if (status !== 'idle') return null; // 자체 조건 판단

  return <div>{/* Idle UI */}</div>;
};

const Accept = ({ mainMessage }: AcceptProps) => {
  const { status } = useDropzoneContext(); // Context 구독

  if (status !== 'accept') return null; // 자체 조건 판단

  return <div>{/* Accept UI */}</div>;
};
```

### 이 패턴의 혁신적인 점

#### 1️⃣ 중앙 집중식 상태, 분산형 렌더링

```tsx
// ❌ 기존 방식: 중앙에서 모든 조건 처리
const BadDropzone = () => {
  const [status, setStatus] = useState('idle');

  const renderContent = () => {
    if (status === 'idle') return <IdleUI />;
    if (status === 'accept') return <AcceptUI />;
    if (status === 'reject') return <RejectUI />;
    if (status === 'loading') return <LoadingUI />;
  };

  return <div>{renderContent()}</div>; // 모든 판단을 여기서!
};

// ✅ 새로운 방식: 각자가 자신의 조건 판단
const GoodDropzone = ({ children }) => {
  return (
    <DropzoneProvider>
      <div>{children}</div>
      {/* 조건 판단은 각 컴포넌트가! */}
    </DropzoneProvider>
  );
};
```

#### 2️⃣ 선언적 API로 의도 명확화

```tsx
// 사용하는 쪽에서 보면 각 상태가 무엇을 하는지 명확
<Dropzone onDrop={handleDrop}>
  <Dropzone.Idle mainMessage="파일을 드래그하세요" supportMessage="최대 10MB" />
  <Dropzone.Accept mainMessage="파일을 놓으세요" />
  <Dropzone.Reject mainMessage="잘못된 파일입니다" />
  <Dropzone.Loading mainMessage="업로드 중..." />
</Dropzone>
```

이런 방식의 핵심 장점:

1. **상태 추가 용이성**: 새 상태 컴포넌트만 추가하면 됨
2. **독립적 테스트**: 각 상태별 컴포넌트를 독립적으로 테스트
3. **코드 분할**: 각 상태의 로직이 완전히 분리됨
4. **타입 안전성**: 각 상태별로 다른 props 타입 적용 가능
5. **재사용성**: 특정 상태만 필요한 곳에서 선택적 사용

## 3부: Panda CSS와 타입 안전성

### Panda CSS를 활용한 스타일 시스템

```tsx
import { sva } from '@styles/css';

export const dropzoneContainer = sva({
  slots: ['container'],
  base: {
    container: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px dashed {colors.border.normal}',
      rounded: 'md',
      minHeight: 200,
      cursor: 'pointer',
      bg: 'bg.surface',
      transition: 'all 0.2s ease',

      '&:hover': {
        borderColor: 'border.hover',
        bg: 'bg.hover',
      },
    },
  },
  variants: {
    status: {
      idle: {
        container: {
          borderColor: 'border.normal',
          bg: 'bg.surface',
        },
      },
      accept: {
        container: {
          borderColor: 'status.success',
          bg: 'success.light',
          '--icon-color': '{colors.status.success}',
        },
      },
      reject: {
        container: {
          borderColor: 'status.error',
          bg: 'error.light',
          '--icon-color': '{colors.status.error}',
        },
      },
      loading: {
        container: {
          borderColor: 'primary.500',
          bg: 'primary.light',
          '--icon-color': '{colors.primary.500}',
        },
      },
    },
    error: {
      true: {
        container: {
          borderColor: 'status.error',
          bg: 'error.light',
        },
      },
    },
  },
  defaultVariants: {
    status: 'idle',
    error: false,
  },
});

export const statusBaseClasses = sva({
  slots: ['container', 'mainText', 'supportText'],
  base: {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 2,

      '& .dropzone-icon': {
        width: 12,
        height: 12,
        fill: 'var(--icon-color, {colors.text.secondary})',
        mb: 3,
      },
    },
    mainText: {
      fontSize: 'lg',
      fontWeight: 'semibold',
      color: 'text.primary',
    },
    supportText: {
      fontSize: 'sm',
      color: 'text.secondary',
      mt: 1,
    },
  },
  variants: {
    status: {
      idle: {
        container: { color: 'text.secondary' },
      },
      accept: {
        container: { color: 'status.success' },
        mainText: { color: 'status.success' },
      },
      reject: {
        container: { color: 'status.error' },
        mainText: { color: 'status.error' },
      },
      loading: {
        container: { color: 'primary.500' },
        mainText: { color: 'primary.500' },
      },
    },
  },
});
```

### 타입 안전성 보장

```tsx
export type BaseProps = {
  mainMessage: ReactNode;
  supportMessage?: ReactNode;
};

// 각 상태별 컴포넌트는 필요한 props만 받도록 제한
type IdleProps = BaseProps & {
  icon: SvgNames; // 아이콘 타입도 제한
  children?: ReactNode;
  status?: 'idle' | 'reject';
};

type AcceptProps = Omit<BaseProps, 'supportMessage'>; // supportMessage 불필요

type RejectProps = BaseProps; // 모든 메시지 필요
```

### 실제 사용법

```tsx
const FileUploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleDrop = async (files: File[]) => {
    console.log('업로드할 파일:', files);

    // 파일 업로드 로직
    try {
      await uploadFiles(files);
      setUploadedFiles(files);
    } catch (error) {
      console.error('업로드 실패:', error);
    }
  };

  return (
    <div className="upload-container">
      <Dropzone
        onDrop={handleDrop}
        accept={['image/*', 'application/pdf']}
        maxSize={10 * 1024 * 1024} // 10MB
        className="custom-dropzone"
      >
        <Dropzone.Idle
          icon="Upload"
          mainMessage="파일을 드래그하거나 클릭하세요"
          supportMessage="최대 10MB, JPG, PNG, PDF 지원"
        />
        <Dropzone.Accept mainMessage="파일을 놓으세요!" />
        <Dropzone.Reject
          mainMessage="지원하지 않는 파일입니다"
          supportMessage="JPG, PNG, PDF만 업로드 가능합니다"
        />
        <Dropzone.Loading
          mainMessage="파일 업로드 중..."
          supportMessage="잠시만 기다려주세요"
        />
      </Dropzone>

      {uploadedFiles.length > 0 && (
        <div className="uploaded-files">
          <h3>업로드된 파일</h3>
          {uploadedFiles.map(file => (
            <div key={file.name}>{file.name}</div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Context 기반 고급 활용

```tsx
const AdvancedFileUpload = () => {
  const handleDrop = async (files: File[]) => {
    // Context의 setStatus를 이용해서 수동 상태 제어도 가능
    try {
      await processFiles(files);
    } catch (error) {
      // 에러 발생 시 reject 상태로 수동 변경
    }
  };

  return (
    <Dropzone onDrop={handleDrop}>
      {/* 커스텀 UI도 Context 상태를 활용 가능 */}
      <CustomDropzoneStatus />

      <Dropzone.Idle mainMessage="기본 상태" />
      <Dropzone.Accept mainMessage="받을 준비 완료" />
      <Dropzone.Reject mainMessage="거부" />
      <Dropzone.Loading mainMessage="처리 중" />
    </Dropzone>
  );
};

// Context를 활용한 커스텀 컴포넌트
const CustomDropzoneStatus = () => {
  const { status, files, error } = useDropzoneContext();

  return (
    <div className="custom-status">
      현재 상태: {status}
      {files.length > 0 && <span>파일 개수: {files.length}</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
};
```

### 실무에서의 Context API 활용의 핵심

```tsx
const FileUploadWithProgress = () => {
  return (
    <Dropzone onDrop={handleUpload}>
      {/* 여러 컴포넌트가 동일한 상태를 공유 */}
      <UploadProgressBar /> {/* Context에서 files 정보 구독 */}
      <FilePreviewList /> {/* Context에서 files 정보 구독 */}
      <DropzoneStatusDisplay /> {/* Context에서 status 정보 구독 */}
      {/* 기본 상태 컴포넌트들 */}
      <Dropzone.Idle mainMessage="파일 드래그" />
      <Dropzone.Accept mainMessage="놓으세요" />
      <Dropzone.Reject mainMessage="잘못된 파일" />
      <Dropzone.Loading mainMessage="업로드 중" />
    </Dropzone>
  );
};

// 모든 컴포넌트가 Context를 통해 동일한 상태에 접근
const UploadProgressBar = () => {
  const { files, status } = useDropzoneContext();

  if (status !== 'loading' || files.length === 0) return null;

  return (
    <div className="progress-bar">
      업로드 중: {files.map(f => f.name).join(', ')}
    </div>
  );
};

const FilePreviewList = () => {
  const { files } = useDropzoneContext();

  return (
    <div className="file-preview">
      {files.map(file => (
        <FilePreview key={file.name} file={file} />
      ))}
    </div>
  );
};
```

## 정리하며

### Keep

- **Context API 활용**: 상태를 중앙 집중식으로 관리하면서 컴포넌트 간 공유
- **관심사 분리**: 각 상태별 UI 로직이 독립적인 컴포넌트로 완벽 분리
- **조건부 렌더링 분산**: 각 컴포넌트가 자신의 표시 조건을 스스로 판단
- **확장성**: 새로운 상태 추가 시 새 컴포넌트만 만들면 됨
- **타입 안전성**: TypeScript로 각 상태에 맞는 props와 Context 타입 강제
- **재사용성**: Context 기반으로 어떤 조합이든 자유롭게 구성 가능

### Problem

- **학습 곡선**: Context API + 컴파운드 컴포넌트 패턴을 팀원들이 이해해야 함
- **초기 설계 비용**: 단순한 DropZone에 비해 초기 구축 시간이 더 필요
- **Context Provider 필수**: 반드시 Provider로 감싸야 하는 구조적 제약
- **성능 고려사항**: Context 값 변경 시 모든 구독 컴포넌트 리렌더링

### Try

- **Context 최적화**: useMemo, useCallback을 활용한 불필요한 리렌더링 방지
- **Progress Context 추가**: 업로드 진행률을 별도 Context로 분리하여 성능 최적화
- **애니메이션 통합**: 상태 전환 시 자연스러운 애니메이션 효과
- **테스트 전략**: Context Provider를 활용한 독립적인 단위 테스트
- **DevTools 연동**: React DevTools에서 Context 상태 추적 개선

---

### 실무에서의 Context API + 컴파운드 컴포넌트 위력

> **[기획자]**: "이제 드래그 상태에서 파일 개수도 보여주면 안 될까요? 그리고 업로드 진행률도..."
>
> **[나]**: (예전 같으면 벙쪘을 상황) "네! Context에 files 정보가 있으니까 FileCountDisplay 컴포넌트만 추가하면 됩니다!"
>
> **[기획자]**: "오, 그럼 기존 상태들은 영향 없나요?"
>
> **[나]**: "전혀 없어요. Context를 구독하는 새 컴포넌트만 추가하면 끝이에요!"

```tsx
// 기획 변경 대응: 단순히 컴포넌트 하나만 추가
<Dropzone onDrop={handleDrop}>
  <FileCountDisplay /> {/* 새로 추가! */}
  <UploadProgressBar /> {/* 새로 추가! */}
  <Dropzone.Idle mainMessage="드래그하세요" />
  <Dropzone.Accept mainMessage="놓으세요" />
  <Dropzone.Reject mainMessage="잘못된 파일" />
  <Dropzone.Loading mainMessage="업로드 중" />
</Dropzone>;

// 새 컴포넌트는 Context만 구독하면 끝
const FileCountDisplay = () => {
  const { files } = useDropzoneContext();
  return files.length > 0 ? <span>파일 {files.length}개</span> : null;
};
```

### Context API + 컴파운드 컴포넌트 패턴의 진정한 가치

**이건 단순히 코드 분리 문제가 아닙니다.** 이 패턴의 핵심은:

#### 1. **상태 공유의 투명성**

- 모든 컴포넌트가 동일한 상태를 실시간으로 공유
- Props drilling 없이 깊은 계층의 컴포넌트도 상태 접근 가능
- 상태 변경 시 관련된 모든 UI가 자동으로 동기화

#### 2. **조합형 개발 방식**

- 레고 블록처럼 필요한 컴포넌트만 조합해서 사용
- 새로운 요구사항 = 새로운 컴포넌트 추가
- 기존 컴포넌트 수정 없이 기능 확장

---

**이제 복잡한 상태 관리가 필요한 모든 컴포넌트에 이 패턴을 적용할 수 있습니다!**

Context API의 상태 공유 능력과 컴파운드 컴포넌트의 조합형 개발 방식을 결합하면, 확장 가능하고 유지보수하기 쉬운 컴포넌트 시스템을 구축할 수 있거든요.

특히 파일 업로드처럼 **복잡한 상태 변화와 다양한 UI 조합이 필요한 경우**에는 이런 접근법이 정말 빛을 발합니다!
