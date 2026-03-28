import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const TopProductsChart = ({ data = [] }) => (
  <div className="chart-shell">
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.18)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} hide />
        <YAxis tickLine={false} axisLine={false} />
        <Tooltip />
        <Bar dataKey="sold" radius={[12, 12, 4, 4]} fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export { TopProductsChart };
