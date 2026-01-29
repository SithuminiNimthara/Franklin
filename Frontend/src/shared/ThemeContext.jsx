import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => {
        return localStorage.getItem('app_theme') || 'Light';
    });

    const setTheme = (newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem('app_theme', newTheme);
    };

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'Dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
