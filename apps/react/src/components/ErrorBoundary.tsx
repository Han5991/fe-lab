import { Component, ErrorInfo, ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  // 자식 컴포넌트에서 에러가 발생하면 상태를 업데이트합니다.
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // 에러 정보를 콘솔에 출력하거나 로깅 서비스에 전달할 수 있습니다.
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary에서 에러가 발생했습니다:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>죄송합니다. 문제가 발생했습니다.</h1>;
    }

    // 에러가 없으면 자식 컴포넌트를 그대로 렌더링합니다.
    return this.props.children;
  }
}
