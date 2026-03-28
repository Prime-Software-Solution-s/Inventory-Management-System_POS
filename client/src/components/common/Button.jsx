import clsx from 'clsx';

const Button = ({
  children,
  className,
  icon: Icon,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}) => (
  <button
    className={clsx('button', `button-${variant}`, `button-${size}`, className)}
    type={type}
    {...props}
  >
    {Icon ? <Icon size={16} strokeWidth={2.2} /> : null}
    <span>{children}</span>
  </button>
);

export { Button };
