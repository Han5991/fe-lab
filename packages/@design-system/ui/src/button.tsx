import { ComponentPropsWithoutRef } from 'react';
import { button, ButtonVariantProps } from '@design-system/ui-lib/recipes';
import { cx } from '@design-system/ui-lib/css';

export interface ButtonProps
  extends ButtonVariantProps,
    ComponentPropsWithoutRef<'button'> {}

export const Button = (props: ButtonProps) => {
  const [variantProps, localProps] = button.splitVariantProps(props);
  const { className, ...rest } = localProps;
  return <button className={cx(button(variantProps), className)} {...rest} />;
};
