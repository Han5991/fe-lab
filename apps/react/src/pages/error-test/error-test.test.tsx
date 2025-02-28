import { render, screen } from "@testing-library/react";
import { vi, describe, test, expect, beforeEach } from "vitest";
import ErrorTest from ".";
import * as hooks from "@/hooks";

// useSimpleQuery 모킹
vi.mock("@/hooks", () => ({
  useSimpleQuery: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ErrorTest 컴포넌트", () => {
  test("성공 케이스: 성공 메시지가 화면에 표시되어야 함", () => {
    // useSimpleQuery 목 구현
    vi.spyOn(hooks, "useSimpleQuery").mockReturnValue({
      data: { message: "Success!" },
      error: null,
      isLoading: false,
    });

    render(<ErrorTest />);
    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  test("에러 케이스: useSimpleQuery에서 에러가 발생하면 에러가 throw 되어야 함", () => {
    // 에러를 throw하는 useSimpleQuery 구현
    const error = new Error("An intentional error occurred");
    vi.spyOn(hooks, "useSimpleQuery").mockImplementation(() => {
      throw error;
    });

    // 컴포넌트 렌더링이 에러를 발생시키는지 확인
    expect(() => render(<ErrorTest />)).toThrow(
      "An intentional error occurred",
    );
  });

  test("로딩 상태: 데이터가 로딩 중일 때 빈 화면이 표시되어야 함", () => {
    // 로딩 중인 상태의 useSimpleQuery 구현
    vi.spyOn(hooks, "useSimpleQuery").mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
    });

    const { container } = render(<ErrorTest />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  test("데이터가 없는 경우: 메시지 없이 빈 div가 렌더링되어야 함", () => {
    // 데이터가 없는 상태의 useSimpleQuery 구현
    vi.spyOn(hooks, "useSimpleQuery").mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
    });

    const { container } = render(<ErrorTest />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });
});
