import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React, { type ComponentProps } from 'react';

type DivProps = ComponentProps<'div'>;

const stub =
  () =>
  ({ children, ...props }: DivProps) =>
    React.createElement('div', props, children);

vi.mock('@design-system/ui-lib/jsx', () => ({
  Box: stub(),
  Grid: stub(),
  Flex: stub(),
  Stack: stub(),
}));
