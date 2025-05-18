import { render, screen } from '@testing-library/react';

import About from '.';

describe('Welcome Component Test Start', () => {
  test('GUI Test - About 컴포넌트 name props', () => {
    render(<About />);
    const AboutElement = screen.getByText(/about/i);
    expect(AboutElement).toBeInTheDocument();
  });
});
