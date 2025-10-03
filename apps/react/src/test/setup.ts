import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock @design-system/ui-lib JSX components
vi.mock('@design-system/ui-lib/jsx', () => ({
  Box: ({ children, ...props }: any) =>
    React.createElement('div', props, children),
  Grid: ({ children, ...props }: any) =>
    React.createElement('div', props, children),
  Flex: ({ children, ...props }: any) =>
    React.createElement('div', props, children),
  Stack: ({ children, ...props }: any) =>
    React.createElement('div', props, children),
}));
