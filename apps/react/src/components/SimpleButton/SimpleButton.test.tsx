import { render, screen, fireEvent } from "@testing-library/react";
import { SimpleButton } from "./SimpleButton";
import { vi } from "vitest";

describe("SimpleButton", () => {
  test("renders with default text", () => {
    render(<SimpleButton />);
    const buttonElement = screen.getByTestId("simple-button");
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement.textContent).toBe("Click me");
  });

  test("renders with custom text", () => {
    render(<SimpleButton initialText="Custom Text" />);
    const buttonElement = screen.getByTestId("simple-button");
    expect(buttonElement.textContent).toBe("Custom Text");
  });

  test("changes text when clicked", () => {
    render(<SimpleButton />);
    const buttonElement = screen.getByTestId("simple-button");
    
    fireEvent.click(buttonElement);
    
    expect(buttonElement.textContent).toBe("Clicked!");
  });

  test("calls onClick callback when clicked", () => {
    const handleClick = vi.fn();
    render(<SimpleButton onClick={handleClick} />);
    const buttonElement = screen.getByTestId("simple-button");
    
    fireEvent.click(buttonElement);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});