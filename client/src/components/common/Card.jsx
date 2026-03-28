import clsx from 'clsx';

const Card = ({ children, className, as: Component = 'section', ...props }) => (
  <Component className={clsx('surface-card', className)} {...props}>
    {children}
  </Component>
);

export { Card };
