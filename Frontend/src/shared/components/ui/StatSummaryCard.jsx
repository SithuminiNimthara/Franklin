import { twMerge } from 'tailwind-merge';

export default function StatSummaryCard({
    icon: Icon,
    value,
    label,
    subtext,
    colorTheme = 'blue',
    className
}) {
    const themes = {
        blue: "from-blue-500 to-cyan-500 hover:shadow-cyan-500/50",
        teal: "from-teal-500 to-green-500 hover:shadow-teal-500/50",
        amber: "from-amber-500 to-orange-500 hover:shadow-amber-500/50",
        purple: "from-purple-500 to-pink-500 hover:shadow-purple-500/50",
        red: "from-red-500 to-rose-500 hover:shadow-red-500/50",
        green: "from-green-500 to-emerald-500 hover:shadow-green-500/50",
        cyan: "from-cyan-500 to-blue-500 hover:shadow-cyan-500/50",
    };

    return (
        <div className={twMerge(
            "bg-gradient-to-br rounded-2xl shadow-2xl p-6 text-white transform hover:scale-105 transition-all duration-300",
            themes[colorTheme] || themes.blue,
            className
        )}>
            <div className="flex items-center justify-between mb-4">
                {Icon && <Icon className="h-8 w-8" />}
                <span className="text-4xl font-bold">{value}</span>
            </div>
            <p className="text-sm font-medium opacity-90">{label}</p>
            {subtext && <p className="text-xs opacity-75 mt-1">{subtext}</p>}
        </div>
    );
}
