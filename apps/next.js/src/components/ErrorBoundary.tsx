"use client";

import React, { Component, type ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 에러 로깅 서비스에 에러를 기록합니다.
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  // 에러가 발생하면 state에 에러 정보를 저장합니다.
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>{this.state.error && <p>{this.state.error.message}</p>}</h1>
        </div>
      );
    }

    // 에러가 없으면 자식 컴포넌트를 그대로 렌더링합니다.
    return this.props.children;
  }
}
