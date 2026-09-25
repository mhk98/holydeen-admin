import { Clock, ShoppingCart, Users, UserCheck } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('en-BD');

export default function StatCards({ summary = {}, loading }) {
  const stats = [
    {
      label: 'Sales Amount',
      value: loading ? '—' : `৳ ${fmt(summary.totalSales)}`,
      icon: Clock,
      gradient: 'linear-gradient(135deg, #1C2744, #3A4B78)',
    },
    {
      label: 'Total Order',
      value: loading ? '—' : fmt(summary.totalOrders),
      icon: ShoppingCart,
      gradient: 'linear-gradient(135deg, #A87E1F, #D7B043)',
    },
    {
      label: 'Total Visitors',
      value: loading ? '—' : fmt(summary.totalVisitors),
      icon: Users,
      gradient: 'linear-gradient(135deg, #2F3D63, #4D6192)',
    },
    {
      label: 'Total Customers',
      value: loading ? '—' : fmt(summary.totalCustomers),
      icon: UserCheck,
      gradient: 'linear-gradient(135deg, #86611C, #C39A28)',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <div
          key={i}
          className="rounded-xl p-4 text-white flex items-center justify-between shadow"
          style={{ background: s.gradient }}
        >
          <div>
            <div className={`text-xl font-bold ${loading ? 'animate-pulse' : ''}`}>{s.value}</div>
            <div className="text-sm opacity-90 mt-0.5">{s.label}</div>
          </div>
          <div className="opacity-70">
            <s.icon size={28} />
          </div>
        </div>
      ))}
    </div>
  );
}
