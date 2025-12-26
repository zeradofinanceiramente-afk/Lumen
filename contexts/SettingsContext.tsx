import React, { createContext, useState, useEffect, useContext } from 'react';
import { getWallpaper, saveWallpaper, deleteWallpaper } from '../utils/wallpaperManager';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../components/firebaseClient';

export type Theme = 'standard' | 'oled' | 'paper' | 'nebula' | 'dracula' | 'high-contrast';
export type FontProfile = 'standard' | 'gothic' | 'confidential' | 'cosmic' | 'executive';

export interface ThemePreset {
    id: Theme;
    label: string;
    accent: string; 
    colors: [string, string]; 
}

export interface GlobalTheme {
    desktop: string | null;
    mobile: string | null;
    accent: string | null;
}

export const PRESET_THEMES: ThemePreset[] = [
    { id: 'standard', label: 'Padrão', accent: '#4ade80', colors: ['#09090b', '#18181b'] },
    { id: 'oled', label: 'OLED (Pure Black)', accent: '#ffffff', colors: ['#000000', '#000000'] },
    { id: 'paper', label: 'Papel de Arroz', accent: '#d6d3d1', colors: ['#1c1917', '#292524'] },
    { id: 'nebula', label: 'Nebula', accent: '#818cf8', colors: ['#0f172a', '#312e81'] },
    { id: 'dracula', label: 'Dracula', accent: '#bd93f9', colors: ['#282a36', '#44475a'] },
    { id: 'high-contrast', label: 'Alto Contraste', accent: '#ffff00', colors: ['#000000', '#ffffff'] },
];

interface SettingsContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    applyThemePreset: (presetId: Theme) => void;
    isHighContrastText: boolean;
    setIsHighContrastText: (value: boolean) => void;
    
    wallpaper: string | null;
    globalTheme: GlobalTheme;
    enableWallpaperMask: boolean; 
    setEnableWallpaperMask: (value: boolean) => void;
    enableFocusMode: boolean;
    setEnableFocusMode: (value: boolean) => void;
    updateWallpaper: (file: File) => Promise<void>;
    removeWallpaper: () => Promise<void>;
    accentColor: string;
    setAccentColor: (color: string) => void;
    
    fontProfile: FontProfile;
    setFontProfile: (font: FontProfile) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    // Tailwind / CSS Modern color functions expect space separated values for alpha support
    return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '74 222 128';
};

export function SettingsProvider({ children }: { children?: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('standard');
    const [isHighContrastText, setIsHighContrastText] = useState(false);
    
    const [wallpaper, setWallpaper] = useState<string | null>(null);
    const [globalTheme, setGlobalTheme] = useState<GlobalTheme>({ desktop: null, mobile: null, accent: null });
    
    const [enableWallpaperMask, setEnableWallpaperMaskState] = useState(true);
    const [enableFocusMode, setEnableFocusModeState] = useState(true); 
    const [accentColor, setAccentColorState] = useState<string>('#4ade80');
    const [fontProfile, setFontProfileState] = useState<FontProfile>('standard');

    // Helper function to set CSS variables for colors
    const applyAccentToDOM = (color: string) => {
        document.documentElement.style.setProperty('--brand-color', color);
        document.documentElement.style.setProperty('--brand-rgb', hexToRgb(color));
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme | null;
        if (savedTheme && PRESET_THEMES.some(p => p.id === savedTheme)) setTheme(savedTheme);
        
        const savedHighContrastText = localStorage.getItem('app-high-contrast-text') === 'true';
        setIsHighContrastText(savedHighContrastText);

        const savedMask = localStorage.getItem('app-wallpaper-mask');
        if (savedMask !== null) setEnableWallpaperMaskState(savedMask === 'true');

        const savedFocus = localStorage.getItem('app-focus-mode');
        if (savedFocus !== null) setEnableFocusModeState(savedFocus === 'true');

        const savedAccent = localStorage.getItem('app-accent-color');
        if (savedAccent) {
            setAccentColorState(savedAccent);
            applyAccentToDOM(savedAccent);
        } else {
            applyAccentToDOM('#4ade80');
        }
        
        const savedFont = localStorage.getItem('app-font-profile') as FontProfile | null;
        if (savedFont) setFontProfileState(savedFont);

        getWallpaper().then(url => { if (url) setWallpaper(url); });
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'system_settings', 'theme_config'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setGlobalTheme({
                    desktop: data.desktopWallpaper || null,
                    mobile: data.mobileWallpaper || null,
                    accent: data.accentColor || null
                });

                const userHasAccent = localStorage.getItem('app-accent-color');
                if (!userHasAccent && data.accentColor) {
                    setAccentColorState(data.accentColor);
                    applyAccentToDOM(data.accentColor);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        PRESET_THEMES.forEach(p => root.classList.remove(p.id));
        root.classList.add(theme);
        root.classList.add('dark');
        
        // Font Profile Sync
        const body = document.body;
        body.classList.remove('font-gothic', 'font-confidential', 'font-cosmic', 'font-executive');
        if (fontProfile !== 'standard') body.classList.add(`font-${fontProfile}`);
        
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
        setAccentColorState(color);
        applyAccentToDOM(color);
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
    };

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