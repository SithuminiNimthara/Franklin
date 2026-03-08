import { twMerge } from 'tailwind-merge';

export default function StatSummaryCard({
    icon: Icon,
    value,
    label,
    subtext,
    colorTheme = 'blue',
    className
}) {
    // Keep color classes for trend indicators, but make the card itself neutral and formal
    const trendClass = typeof subtext === 'string' && subtext.includes('↑')
        ? "text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md"
        : typeof subtext === 'string' && subtext.includes('↓')
            ? "text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-md"
            : "text-slate-500 dark:text-slate-400 font-medium";

    // Split arrow out to colorize just the arrow and stat, keeping text neutral if possible
    const parseSubtext = (text) => {
        if (typeof text !== 'string') return text;
        const parts = text.split(' ');
        if (parts[0] === '↑' || parts[0] === '↓') {
            return (
                <>
                    <span className={trendClass}>{parts[0]} {parts[1]}</span>
                    <span className="ml-1.5 opacity-80">{parts.slice(2).join(' ')}</span>
                </>
            )
        }
        return text;
    };

    return (
        <div className={twMerge(
            "bg-white dark:bg-slate-[0B1120] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between",
            className
        )}>
            <div className="flex flex-row items-center justify-between pb-3">
                <h3 className="tracking-tight text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {label}
                </h3>
                {Icon && <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" strokeWidth={2.5} />}
            </div>
            <div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {value}
                </div>
                {subtext && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center">
                        {parseSubtext(subtext)}
                    </p>
                )}
            </div>
        </div>
    );
}