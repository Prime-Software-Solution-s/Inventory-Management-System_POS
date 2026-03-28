const SectionHeader = ({ eyebrow, title, description, action }) => (
  <div className="section-header">
    <div className="section-copy">
      {eyebrow ? <span className="section-eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
    {action ? <div className="section-action">{action}</div> : null}
  </div>
);

export { SectionHeader };
