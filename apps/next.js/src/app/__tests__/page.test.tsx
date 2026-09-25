import { fireEvent, mockRouter, render, screen } from '@test/util';
import Page from '../page';

// 손으로 베낀 사본이 아니라 실제 app/page.tsx를 렌더한다.
// next/link·디자인 시스템·Panda css는 vitest.config.mts의 alias가 test/__mocks__로 바꾼다.
describe('Page', () => {
  beforeEach(() => {
    mockRouter.setCurrentUrl('/');
  });

  it('제목과 버튼을 그린다', () => {
    render(<Page />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Home' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'count' })).toBeInTheDocument();
  });

  it('링크를 누르면 /about으로 이동한다', () => {
    render(<Page />);

    const link = screen.getByRole('link', { name: 'link' });
    expect(link).toHaveAttribute('href', '/about');

    fireEvent.click(link);

    expect(mockRouter.asPath).toBe('/about');
  });
});
