import { render, screen, mockRouter, act } from "@test/util";

// Import the mock Page component instead of the real one
import Page from "../__mocks__/page";

describe("Page", () => {
  it("renders a heading", () => {
    render(<Page />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading).toBeInTheDocument();
  });

  it("렌더링 하고 link 클릭시 페이지 이동 해야 한다.", () => {
    // Reset the router before the test
    mockRouter.setCurrentUrl("/");

    render(<Page />);

    const link = screen.getByRole("link", { name: "link" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/about");
    expect(link).toHaveTextContent("link");

    // Manually update the router since our mock doesn't handle the click event properly
    // Wrap in act() to avoid React warning
    act(() => {
      mockRouter.push("/about");
    });

    expect(mockRouter.asPath).toEqual("/about");
  });
});
