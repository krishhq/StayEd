import React, { createContext, useContext } from 'react';
import { Colors } from '../constants/DesignSystem';

type Theme = 'light' | 'dark';

interface ThemeColors {
    background: string;
    text: string;
    card: string;
    primary: string;
    secondary: string;
    border: string;
    subText: string;
    success: string;
    warning: string;
    error: string;
    info: string;
}

export const lightColors: ThemeColors = Colors.light;
export const darkColors: ThemeColors = Colors.dark;

interface ThemeContextType {
    theme: Theme;
    colors: ThemeColors;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = React.useState<Theme>('light'); // Changed to state to allow toggling

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const colors = theme === 'light' ? lightColors : darkColors;

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
