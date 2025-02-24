import { render, screen } from "@testing-library/react";
import { MockInstance } from "vitest";
import ErrorTest from "."; // 경로는 실제 파일 위치에 맞게 조정하세요
import { useSimpleQuery } from "@/hooks"; // useSimpleQuery 모킹

// useSimpleQuery 모킹
vi.mock("@/hooks", () => ({
  useSimpleQuery: vi.fn(),
}));

describe("ErrorTest Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("성공 케이스: 메시지가 올바르게 표시되어야 함", () => {
    const mockUseSimpleQuery = useSimpleQuery as unknown as MockInstance;
    mockUseSimpleQuery.mockReturnValue({
      data: { message: "Success!" },
    });

    render(<ErrorTest />);

    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  test("에러 케이스: useSimpleQuery에서 에러가 발생하는 경우", () => {
    const mockUseSimpleQuery = useSimpleQuery as unknown as MockInstance;
    mockUseSimpleQuery.mockImplementation(() => {
      throw new Error("An intentional error occurred");
    });

    expect(() => {
      render(<ErrorTest />);
    }).toThrow("An intentional error occurred");
  });

  test("로딩 상태: data가 undefined인 경우 아무것도 표시되지 않아야 함", () => {
    const mockUseSimpleQuery = useSimpleQuery as unknown as MockInstance;
    mockUseSimpleQuery.mockReturnValue({
      data: undefined,
    });

    const { container } = render(<ErrorTest />);

    expect(container.firstChild).toBeEmptyDOMElement();
  });
});
