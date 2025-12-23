
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getWallpaper, saveWallpaper, deleteWallpaper } from '../utils/wallpaperManager';

export type Theme = 
    | 'light' | 'dark' 
    | 'galactic-aurora' | 'dragon-year' | 'emerald-sovereignty' 
    | 'akebono-dawn' | 'sorcerer-supreme' | 'neon-cyber';

export interface ThemePreset {
    id: Theme;
    label: string;
    accent: string; // Hex for logic
    mode: 'light' | 'dark';
    colors: [string, string]; // Colors for the gradient preview bubble
}

export const PRESET_THEMES: ThemePreset[] = [
    { id: 'dark', label: 'Padrão (Deep Space)', accent: '#6366f1', mode: 'dark', colors: ['#0f172a', '#1e1b4b'] },
    { id: 'neon-cyber', label: 'Neon Cyber', accent: '#d946ef', mode: 'dark', colors: ['#2e1065', '#be185d'] },
    { id: 'emerald-sovereignty', label: 'Esmeralda', accent: '#34D399', mode: 'dark', colors: ['#064E3B', '#020403'] },
    { id: 'galactic-aurora', label: 'Aurora', accent: '#D90429', mode: 'dark', colors: ['#0F1014', '#D90429'] },
    { id: 'dragon-year', label: 'Gold', accent: '#FFD700', mode: 'dark', colors: ['#5D0E0E', '#FFD700'] },
    { id: 'sorcerer-supreme', label: 'Místico', accent: '#0ea5e9', mode: 'dark', colors: ['#020617', '#38bdf8'] },
];

interface SettingsContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    applyThemePreset: (presetId: Theme) => void;
    isHighContrastText: boolean;
    setIsHighContrastText: (value: boolean) => void;
    
    // Customization
    wallpaper: string | null;
    updateWallpaper: (file: File) => Promise<void>;
    removeWallpaper: () => Promise<void>;
    accentColor: string;
    setAccentColor: (color: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper to convert HEX to RGB for CSS variable usage (allows opacity)
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '99, 102, 241';
};

export function SettingsProvider({ children }: { children?: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');
    const [isHighContrastText, setIsHighContrastText] = useState(false);
    
    const [wallpaper, setWallpaper] = useState<string | null>(null);
    const [accentColor, setAccentColorState] = useState<string>('#6366f1');

    // Function to apply accent color to DOM and State
    const updateAccentVariables = (color: string) => {
        setAccentColorState(color);
        document.documentElement.style.setProperty('--brand-color', color);
        document.documentElement.style.setProperty('--brand-rgb', hexToRgb(color));
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme | null;
        if (savedTheme) setTheme(savedTheme);
        
        const savedHighContrastText = localStorage.getItem('app-high-contrast-text') === 'true';
        setIsHighContrastText(savedHighContrastText);

        const savedAccent = localStorage.getItem('app-accent-color');
        if (savedAccent) {
            updateAccentVariables(savedAccent);
        } else {
            const currentPreset = PRESET_THEMES.find(p => p.id === (savedTheme || 'dark'));
            if (currentPreset) {
                updateAccentVariables(currentPreset.accent);
            }
        }

        // Load Wallpaper
        getWallpaper().then(url => {
            if (url) setWallpaper(url);
        });
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        // Clean up theme classes
        root.classList.remove(...PRESET_THEMES.map(p => p.id), 'light', 'dark'); 
        
        root.classList.add(theme);
        
        const preset = PRESET_THEMES.find(p => p.id === theme);
        const baseMode = preset ? preset.mode : 'dark';

        if (baseMode === 'light') {
            root.classList.remove('dark');
            root.classList.add('light');
        } else {
            root.classList.remove('light');
            root.classList.add('dark');
        }
        
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

    const applyThemePreset = (presetId: Theme) => {
        const preset = PRESET_THEMES.find(p => p.id === presetId);
        if (preset) {
            setTheme(preset.id);
            setAccentColor(preset.accent); 
        }
    };

    const value = { 
        theme, setTheme, applyThemePreset,
        isHighContrastText, setIsHighContrastText,
        wallpaper, updateWallpaper: updateWallpaperState, removeWallpaper: removeWallpaperState,
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
