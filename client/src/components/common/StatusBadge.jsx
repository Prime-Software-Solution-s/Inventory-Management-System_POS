import clsx from 'clsx';

const StatusBadge = ({ tone = 'neutral', children }) => (
  <span className={clsx('status-badge', `status-${tone}`)}>{children}</span>
);

export { StatusBadge };
