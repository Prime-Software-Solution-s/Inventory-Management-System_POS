const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={`empty-state ${className}`.trim()}>
    <div className="empty-state-icon">{Icon ? <Icon size={20} /> : null}</div>
    <div className="empty-state-copy">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
    {action ? <div className="empty-state-action">{action}</div> : null}
  </div>
);

export { EmptyState };
