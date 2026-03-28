import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const SalesTrendChart = ({ data = [] }) => (
  <div className="chart-shell">
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.18)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(value) => formatCurrency(value).replace('.00', '')}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Area
          type="monotone"
          dataKey="sales"
          stroke="#0f766e"
          strokeWidth={3}
          fill="url(#sales-fill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export { SalesTrendChart };
