import type { ReactElement } from "react";
import type { RenderOptions } from "@testing-library/react";
import { render as testingLibraryRender } from "@testing-library/react";
import { MemoryRouterProvider } from "next-router-mock/MemoryRouterProvider";

// Create a custom renderer that doesn't use the wrapper option
// This avoids the React version mismatch issue
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) =>
  testingLibraryRender(
    <MemoryRouterProvider>{ui}</MemoryRouterProvider>,
    options,
  );

export * from "@testing-library/react";
export * from "next-router-mock";
export { default as mockRouter } from "next-router-mock";
export { customRender as render };
