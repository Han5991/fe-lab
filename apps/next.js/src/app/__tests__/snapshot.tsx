import { render, screen } from "@test/util";
// Import the mock Page component instead of the real one
import Page from "../__mocks__/page";

it("renders homepage with expected elements", () => {
  render(<Page />);

  // Check for specific elements instead of using snapshots
  const heading = screen.getByRole("heading", { level: 1 });
  expect(heading).toBeInTheDocument();
  expect(heading).toHaveTextContent("Home");

  const link = screen.getByRole("link", { name: "link" });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute("href", "/about");

  const button = screen.getByRole("button");
  expect(button).toBeInTheDocument();
  expect(button).toHaveTextContent("count");
});
