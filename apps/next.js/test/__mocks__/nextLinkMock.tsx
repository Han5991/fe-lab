import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import mockRouter from 'next-router-mock';

interface LinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> {
  href: string;
}

/**
 * next/link 대역: 클릭하면 페이지를 새로 불러오는 대신 next-router-mock의 라우터로 이동한다
 */
const Link = ({ href, onClick, ...props }: LinkProps) => {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    mockRouter.push(href);
    onClick?.(event);
  };

  return <a href={href} {...props} onClick={handleClick} />;
};

export default Link;
