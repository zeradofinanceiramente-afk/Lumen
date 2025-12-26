
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getWallpaper, saveWallpaper, deleteWallpaper } from '../utils/wallpaperManager';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../components/firebaseClient';

export type Theme = 'standard' | 'oled' | 'paper' | 'nebula' | 'dracula' | 'high-contrast';
export type FontProfile = 'standard' | 'gothic' | 'confidential' | 'cosmic' | 'executive';

export interface ThemePreset {
    id: Theme;
    label: string;
    accent: string; // Used for preview mainly
    colors: [string, string]; // Colors for the gradient preview bubble
}

export interface GlobalTheme {
    desktop: string | null;
    mobile: string | null;
    accent: string | null;
}

// Catálogo de Temas Simplificado (Arquitetura Minimalista)
export const PRESET_THEMES: ThemePreset[] = [
    { id: 'standard', label: 'Padrão', accent: '#4ade80', colors: ['#09090b', '#18181b'] }, // Dark Slate Base
    { id: 'oled', label: 'OLED (Pure Black)', accent: '#ffffff', colors: ['#000000', '#000000'] }, // True Black
    { id: 'paper', label: 'Papel de Arroz', accent: '#d6d3d1', colors: ['#1c1917', '#292524'] }, // Warm Stone / Translucent
    { id: 'nebula', label: 'Nebula', accent: '#818cf8', colors: ['#0f172a', '#312e81'] }, // Deep Space Blue
    { id: 'dracula', label: 'Dracula', accent: '#bd93f9', colors: ['#282a36', '#44475a'] }, // Vampire Coding Theme
    { id: 'high-contrast', label: 'Alto Contraste', accent: '#ffff00', colors: ['#000000', '#ffffff'] }, // Acessibilidade
];

interface SettingsContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    applyThemePreset: (presetId: Theme) => void;
    isHighContrastText: boolean;
    setIsHighContrastText: (value: boolean) => void;
    
    // Customization
    wallpaper: string | null; // User local override
    globalTheme: GlobalTheme; // Admin global settings
    enableWallpaperMask: boolean; 
    setEnableWallpaperMask: (value: boolean) => void;
    enableFocusMode: boolean; // NEW: Toggle automatic focus mode
    setEnableFocusMode: (value: boolean) => void; // NEW
    updateWallpaper: (file: File) => Promise<void>;
    removeWallpaper: () => Promise<void>;
    accentColor: string;
    setAccentColor: (color: string) => void;
    
    fontProfile: FontProfile; // NEW
    setFontProfile: (font: FontProfile) => void; // NEW
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
    const [globalTheme, setGlobalTheme] = useState<GlobalTheme>({ desktop: null, mobile: null, accent: null });
    
    const [enableWallpaperMask, setEnableWallpaperMaskState] = useState(true);
    const [enableFocusMode, setEnableFocusModeState] = useState(true); // Default true for cognitive load management
    const [accentColor, setAccentColorState] = useState<string>('#4ade80');
    
    const [fontProfile, setFontProfileState] = useState<FontProfile>('standard');

    // Function to apply accent color to DOM and State
    const updateAccentVariables = (color: string) => {
        setAccentColorState(color);
        document.documentElement.style.setProperty('--brand-color', color);
        document.documentElement.style.setProperty('--brand-rgb', hexToRgb(color));
    };

    // Load Local Preferences
    useEffect(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme | null;
        if (savedTheme && PRESET_THEMES.some(p => p.id === savedTheme)) {
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

        const savedFocus = localStorage.getItem('app-focus-mode');
        if (savedFocus !== null) {
            setEnableFocusModeState(savedFocus === 'true');
        }

        const savedAccent = localStorage.getItem('app-accent-color');
        if (savedAccent) {
            updateAccentVariables(savedAccent);
        }
        
        const savedFont = localStorage.getItem('app-font-profile') as FontProfile | null;
        if (savedFont && ['standard', 'gothic', 'confidential', 'cosmic', 'executive'].includes(savedFont)) {
            setFontProfileState(savedFont);
        }

        // Load User Custom Wallpaper (Blob)
        getWallpaper().then(url => {
            if (url) setWallpaper(url);
        });
    }, []);

    // Load Global Admin Theme (Realtime)
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'system_settings', 'theme_config'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setGlobalTheme({
                    desktop: data.desktopWallpaper || null,
                    mobile: data.mobileWallpaper || null,
                    accent: data.accentColor || null
                });

                // Apply Global Accent if user hasn't set a preference
                const userHasAccent = localStorage.getItem('app-accent-color');
                if (!userHasAccent && data.accentColor) {
                    updateAccentVariables(data.accentColor);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        root.className = ''; 
        root.classList.add(theme);
        root.classList.add('dark');
        
        // Font Profile Application
        document.body.classList.remove('font-gothic', 'font-confidential', 'font-cosmic', 'font-executive');
        if (fontProfile !== 'standard') {
            document.body.classList.add(`font-${fontProfile}`);
        }
        
        localStorage.setItem('app-theme', theme);
    }, [theme, fontProfile]);

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
    };

    const setEnableFocusMode = (value: boolean) => {
        setEnableFocusModeState(value);
        localStorage.setItem('app-focus-mode', String(value));
    };
    
    const setFontProfile = (font: FontProfile) => {
        setFontProfileState(font);
        localStorage.setItem('app-font-profile', font);
    }

    const applyThemePreset = (presetId: Theme) => {
        setTheme(presetId);
        if (presetId === 'high-contrast') {
            setIsHighContrastText(true);
            setAccentColor('#ffff00'); 
        }
    };

    const value = { 
        theme, setTheme, applyThemePreset,
        isHighContrastText, setIsHighContrastText,
        wallpaper, globalTheme, 
        enableWallpaperMask, setEnableWallpaperMask, 
        enableFocusMode, setEnableFocusMode,
        updateWallpaper: updateWallpaperState, removeWallpaper: removeWallpaperState,
        accentColor, setAccentColor,
        fontProfile, setFontProfile
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
