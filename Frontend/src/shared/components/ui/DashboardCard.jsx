import { Card, CardContent } from "./Card";

export default function DashboardCard({
  title,
  icon: Icon,
  iconColor = "text-gray-700",
  iconBg = "bg-gray-100",
  right = null,
  children,
}) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>

            {/* ✅ only render icon when provided */}
            {Icon ? (
              <div className={`${iconBg} p-3 rounded-xl`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
              </div>
            ) : null}
          </div>

          {/* ✅ render right-side actions if passed */}
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>

        {children}
      </CardContent>
    </Card>
  );
}
