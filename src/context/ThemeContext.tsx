import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeColors {
    background: string;
    text: string;
    card: string;
    primary: string;
    border: string;
    subText: string;
}

export const lightColors: ThemeColors = {
    background: '#f5f5f5',
    text: '#333333',
    card: '#ffffff',
    primary: '#007AFF',
    border: '#eeeeee',
    subText: '#666666',
};

export const darkColors: ThemeColors = {
    background: '#121212',
    text: '#ffffff',
    card: '#1e1e1e',
    primary: '#0a84ff',
    border: '#333333',
    subText: '#aaaaaa',
};

interface ThemeContextType {
    theme: Theme;
    colors: ThemeColors;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [theme, setTheme] = useState<Theme>(systemScheme === 'dark' ? 'dark' : 'light');

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
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
