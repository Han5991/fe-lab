import type { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MemoryRouterProvider } from "next-router-mock/MemoryRouterProvider";

const AllTheProviders = ({ children }: { children: ReactNode }) => (
  <MemoryRouterProvider>{children}</MemoryRouterProvider>
);

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export * from "next-router-mock";
export { default as mockRouter } from "next-router-mock";
export { customRender as render };
