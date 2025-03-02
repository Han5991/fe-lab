import { render, screen, fireEvent, mockRouter } from "@test/util";

import Page from "../page";

describe("Page", () => {
  it("renders a heading", () => {
    render(<Page />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading).toBeInTheDocument();
  });

  it("렌더링 하고 link 클릭시 페이지 이동 해야 한다.", () => {
    render(<Page />);

    const link = screen.getByRole("link", { name: "link" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/about");
    expect(link).toHaveTextContent("link");
    fireEvent.click(link);

    expect(mockRouter.asPath).toEqual("/about");
  });
});
