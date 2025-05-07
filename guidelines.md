# FE-Lab Development Guidelines

This document provides guidelines and instructions for developing and testing applications in the FE-Lab monorepo.

## Build/Configuration Instructions

### Prerequisites

- Node.js >= 20
- pnpm 10.4.1 or later

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start development server for a specific application:

   ```bash
   # For React application
   pnpm react

   # For Next.js application
   pnpm next

   # For TypeScript application
   pnpm typescript
   ```

3. Build all applications:
   ```bash
   pnpm build
   ```

### Monorepo Structure

- `apps/` - Contains all applications
  - `react/` - React application using Vite
  - `next.js/` - Next.js application
  - `typescript/` - TypeScript application
  - `blog/` - Blog content
- `packages/` - Contains shared packages
  - `@design-system/ui` - UI component library
  - `@design-system/ui-lib` - UI utilities library

## Testing Information

### Testing Framework

The project uses Vitest as the testing framework with React Testing Library for testing React components.

### Running Tests

To run tests for all applications:

```bash
pnpm test
```

To run tests for a specific application:

```bash
cd apps/react && pnpm test
```

### Writing Tests

#### Component Tests

For React components, create a `.test.tsx` file next to the component file. Example:

```tsx
// SimpleButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SimpleButton } from './SimpleButton';
import { vi } from 'vitest';

describe('SimpleButton', () => {
  test('renders with default text', () => {
    render(<SimpleButton />);
    const buttonElement = screen.getByTestId('simple-button');
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement.textContent).toBe('Click me');
  });

  test('calls onClick callback when clicked', () => {
    const handleClick = vi.fn();
    render(<SimpleButton onClick={handleClick} />);
    const buttonElement = screen.getByTestId('simple-button');

    fireEvent.click(buttonElement);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Hook Tests

For custom hooks, create a `.test.ts` file next to the hook file. Example:

```tsx
// useSimpleQuery.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useSimpleQuery } from './useSimpleQuery';

describe('useSimpleQuery', () => {
  test('successfully fetches data', async () => {
    const mockData = { message: 'success' };
    const mockQueryFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useSimpleQuery({
        queryFn: mockQueryFn,
      }),
    );

    // Check initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    // Wait for data loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check final state
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });
});
```

### Test Best Practices

1. Use data-testid attributes for selecting elements in tests
2. Mock external dependencies and API calls
3. Test component behavior, not implementation details
4. Write focused tests that verify a single aspect of functionality
5. Use descriptive test names that explain what is being tested

## Code Style and Development Guidelines

### Code Style

The project uses ESLint for code linting with the following configuration:

- TypeScript ESLint recommended rules
- React Hooks ESLint rules
- React Refresh ESLint rules
- Consistent type imports with preference for type-imports

To run linting:

```bash
pnpm lint
```

To check TypeScript types:

```bash
pnpm check-types
```

### Development Workflow

1. Create a new feature or fix in the appropriate application or package
2. Write tests for the new code
3. Run tests to ensure they pass
4. Run linting and type checking to ensure code quality
5. Build the application to ensure it compiles correctly
6. Submit your changes

### Component Development

When creating new components:

1. Create a new directory in the appropriate location (e.g., `src/components/ComponentName`)
2. Create the component file (e.g., `ComponentName.tsx`)
3. Create a test file (e.g., `ComponentName.test.tsx`)
4. Create an index.ts file to export the component
5. Add the component to the appropriate exports if it should be part of a public API

### Workspace Dependencies

To use a workspace package in another package or application, add it as a dependency with the `workspace:` protocol:

```json
{
  "dependencies": {
    "@design-system/ui": "workspace:^"
  }
}
```

This ensures that the local version of the package is used during development.
