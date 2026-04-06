import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem('jaagrmind_theme');
        return stored || 'system';
    });
    
    const [resolvedTheme, setResolvedTheme] = useState('dark');

    useEffect(() => {
        const updateTheme = () => {
            if (theme === 'system') {
                const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setResolvedTheme(isSystemDark ? 'dark' : 'light');
            } else {
                setResolvedTheme(theme);
            }
        };

        updateTheme();

        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = () => { if (theme === 'system') updateTheme(); };
        mql.addEventListener('change', listener);

        localStorage.setItem('jaagrmind_theme', theme);
        return () => mql.removeEventListener('change', listener);
    }, [theme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', resolvedTheme);
    }, [resolvedTheme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const value = {
        theme,
        setTheme,
        toggleTheme,
        isDark: resolvedTheme === 'dark' // Use resolved state for styling queries
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
