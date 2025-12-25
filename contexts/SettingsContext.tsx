
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getWallpaper, saveWallpaper, deleteWallpaper } from '../utils/wallpaperManager';

export type Theme = 'standard' | 'oled';

export interface ThemePreset {
    id: Theme;
    label: string;
    accent: string; // Used for preview mainly
    colors: [string, string]; // Colors for the gradient preview bubble
}

// Catálogo de Temas Simplificado (Arquitetura Minimalista)
export const PRESET_THEMES: ThemePreset[] = [
    { id: 'standard', label: 'Padrão', accent: '#4ade80', colors: ['#09090b', '#18181b'] }, // Dark Slate Base
    { id: 'oled', label: 'OLED (Pure Black)', accent: '#ffffff', colors: ['#000000', '#000000'] }, // True Black
];

interface SettingsContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    applyThemePreset: (presetId: Theme) => void;
    isHighContrastText: boolean;
    setIsHighContrastText: (value: boolean) => void;
    
    // Customization
    wallpaper: string | null;
    enableWallpaperMask: boolean; // New control
    setEnableWallpaperMask: (value: boolean) => void; // New setter
    updateWallpaper: (file: File) => Promise<void>;
    removeWallpaper: () => Promise<void>;
    accentColor: string;
    setAccentColor: (color: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper to convert HEX to RGB for CSS variable usage (allows opacity)
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '74, 222, 128';
};

export function SettingsProvider({ children }: { children?: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('standard');
    const [isHighContrastText, setIsHighContrastText] = useState(false);
    
    const [wallpaper, setWallpaper] = useState<string | null>(null);
    const [enableWallpaperMask, setEnableWallpaperMaskState] = useState(true);
    const [accentColor, setAccentColorState] = useState<string>('#4ade80');

    // Function to apply accent color to DOM and State
    const updateAccentVariables = (color: string) => {
        setAccentColorState(color);
        document.documentElement.style.setProperty('--brand-color', color);
        document.documentElement.style.setProperty('--brand-rgb', hexToRgb(color));
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme | null;
        // Validate saved theme against current allowed types
        if (savedTheme && (savedTheme === 'standard' || savedTheme === 'oled')) {
            setTheme(savedTheme);
        } else {
            setTheme('standard');
        }
        
        const savedHighContrastText = localStorage.getItem('app-high-contrast-text') === 'true';
        setIsHighContrastText(savedHighContrastText);

        const savedMask = localStorage.getItem('app-wallpaper-mask');
        if (savedMask !== null) {
            setEnableWallpaperMaskState(savedMask === 'true');
        }

        const savedAccent = localStorage.getItem('app-accent-color');
        if (savedAccent) {
            updateAccentVariables(savedAccent);
        } else {
            // Apply default accent if none saved
            updateAccentVariables('#4ade80'); 
        }

        // Load Wallpaper
        getWallpaper().then(url => {
            if (url) setWallpaper(url);
        });
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        // Clean up classes
        root.className = ''; 
        root.classList.add(theme);
        
        // Force dark mode class for Tailwind regardless of theme
        root.classList.add('dark');
        
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const updateWallpaperState = async (file: File) => {
        await saveWallpaper(file);
        const url = URL.createObjectURL(file);
        setWallpaper(url);
    };

    const removeWallpaperState = async () => {
        await deleteWallpaper();
        setWallpaper(null);
    };

    const setAccentColor = (color: string) => {
        updateAccentVariables(color);
        localStorage.setItem('app-accent-color', color);
    };

    const setEnableWallpaperMask = (value: boolean) => {
        setEnableWallpaperMaskState(value);
        localStorage.setItem('app-wallpaper-mask', String(value));
    }

    const applyThemePreset = (presetId: Theme) => {
        setTheme(presetId);
        // Note: We no longer force the accent color when changing the background theme,
        // allowing the user to keep their chosen accent.
    };

    const value = { 
        theme, setTheme, applyThemePreset,
        isHighContrastText, setIsHighContrastText,
        wallpaper, enableWallpaperMask, setEnableWallpaperMask, 
        updateWallpaper: updateWallpaperState, removeWallpaper: removeWallpaperState,
        accentColor, setAccentColor
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
