import { twMerge } from 'tailwind-merge';

export function Card({ children, className }) {
    return (
        <div className={twMerge("bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100", className)}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className }) {
    return (
        <div className={twMerge("p-6 pb-0", className)}>
            {children}
        </div>
    );
}

export function CardContent({ children, className }) {
    return (
        <div className={twMerge("p-6", className)}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className }) {
    return (
        <h3 className={twMerge("text-lg font-semibold text-gray-800", className)}>
            {children}
        </h3>
    );
}
