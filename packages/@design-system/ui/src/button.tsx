import type { ComponentPropsWithoutRef } from 'react';
import { button, type ButtonVariantProps } from '../styled-system/recipes';
import { cx } from '../styled-system/css';

export interface ButtonProps
  extends ButtonVariantProps, ComponentPropsWithoutRef<'button'> {}

export const Button = (props: ButtonProps) => {
  const [variantProps, localProps] = button.splitVariantProps(props);
  const { className, ...rest } = localProps;
  return <button className={cx(button(variantProps), className)} {...rest} />;
};
