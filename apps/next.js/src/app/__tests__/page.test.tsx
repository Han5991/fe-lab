import { fireEvent, mockRouter, render, screen } from '@test/util';
import Page from '../page';

// next/link·디자인 시스템·Panda css는 vitest.config.mts의 alias가 test/__mocks__로 바꾼다
test('실제 홈 페이지를 그리고 링크를 누르면 /about으로 이동한다', () => {
  mockRouter.setCurrentUrl('/');
  render(<Page />);

  expect(
    screen.getByRole('heading', { level: 1, name: 'Home' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'count' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('link', { name: 'link' }));

  expect(mockRouter.asPath).toBe('/about');
});
