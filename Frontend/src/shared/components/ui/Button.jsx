import { twMerge } from 'tailwind-merge';

export default function Button({
    children,
    variant = 'primary',
    className,
    icon: Icon,
    ...props
}) {
    const baseStyles = "font-medium py-3 rounded-xl transition-all duration-200 shadow-md transform hover:scale-105 flex items-center justify-center";

    const variants = {
        primary: "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white hover:shadow-xl",
        secondary: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:shadow-lg",
        danger: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white hover:shadow-xl",
        success: "bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white hover:shadow-xl",
        warning: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white hover:shadow-xl",
        purple: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:shadow-xl",
    };

    return (
        <button
            className={twMerge(baseStyles, variants[variant], className)}
            {...props}
        >
            {Icon && <Icon className="mr-2 h-5 w-5" />}
            {children}
        </button>
    );
}
