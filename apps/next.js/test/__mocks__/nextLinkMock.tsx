import type { ComponentProps } from 'react';
import mockRouter from 'next-router-mock';

interface LinkProps extends ComponentProps<'a'> {
  href: string;
}

const Link = ({ href, onClick, ...props }: LinkProps) => (
  <a
    href={href}
    {...props}
    onClick={event => {
      event.preventDefault();
      mockRouter.push(href);
      onClick?.(event);
    }}
  />
);

export default Link;
