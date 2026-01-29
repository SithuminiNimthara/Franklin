import { Card, CardContent } from './Card';

export default function DashboardCard({ title, icon: Icon, iconColor, iconBg, children }) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-slate-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
          <div className={`${iconBg} p-3 rounded-xl`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
        {children}
      </CardContent>
    </Card>

  );
}
