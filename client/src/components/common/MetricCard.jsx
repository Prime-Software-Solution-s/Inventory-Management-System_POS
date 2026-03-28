import { Card } from './Card';

const MetricCard = ({ title, value, detail, icon: Icon, accent = 'blue' }) => (
  <Card className={`metric-card metric-${accent}`}>
    <span className="metric-card-blur" aria-hidden="true" />
    <div className="metric-card-header">
      <div className="metric-card-copy">
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
      <div className="metric-icon-shell">
        <div className="metric-icon">
          <Icon size={18} />
        </div>
      </div>
    </div>
    <p>{detail}</p>
  </Card>
);

export { MetricCard };
