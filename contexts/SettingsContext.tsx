
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getWallpaper, saveWallpaper, deleteWallpaper } from '../utils/wallpaperManager';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../components/firebaseClient';

export type Theme = 'standard' | 'oled' | 'paper' | 'nebula' | 'dracula' | 'high-contrast' | 'matrix' | 'synthwave' | 'repository' | 'sith' | 'eva' | 'limitless' | 'restless-dreams' | 'shadow-monarch' | 'world-on-fire';
export type FontProfile = 'standard' | 'gothic' | 'confidential' | 'cosmic' | 'executive';

export interface ThemePreset {
    id: Theme;
    label: string;
    accent: string; 
    colors: [string, string]; // Start and End gradient colors for preview
}

export interface GlobalTheme {
    desktop: string | null;
    mobile: string | null;
    accent: string | null;
}

export const PRESET_THEMES: ThemePreset[] = [
    { id: 'standard', label: 'Padrão', accent: '#4ade80', colors: ['#09090b', '#18181b'] },
    { id: 'shadow-monarch', label: 'Shadow Monarch', accent: '#00a8ff', colors: ['#050510', '#020617'] }, // Solo Leveling
    { id: 'world-on-fire', label: 'Hell\'s Kitchen', accent: '#dc2626', colors: ['#0a0000', '#1a0505'] }, // Daredevil
    { id: 'limitless', label: 'Limitless', accent: '#00d2ff', colors: ['#000000', '#0a0a1a'] },
    { id: 'restless-dreams', label: 'Restless Dreams', accent: '#8a1c1c', colors: ['#1a1c1a', '#0f0f0e'] },
    { id: 'oled', label: 'OLED', accent: '#ffffff', colors: ['#000000', '#000000'] },
    { id: 'repository', label: 'Repository', accent: '#3b82f6', colors: ['#0d1117', '#161b22'] },
    { id: 'sith', label: 'Sith', accent: '#ef4444', colors: ['#0f0505', '#2a0505'] },
    { id: 'eva', label: 'Unit-01', accent: '#a3e635', colors: ['#2e1065', '#4c1d95'] },
    { id: 'matrix', label: 'Matrix', accent: '#22c55e', colors: ['#000000', '#052e16'] },
    { id: 'synthwave', label: 'Synthwave', accent: '#d946ef', colors: ['#2e022d', '#4a044e'] },
    { id: 'nebula', label: 'Nebula', accent: '#818cf8', colors: ['#0f172a', '#312e81'] },
    { id: 'dracula', label: 'Dracula', accent: '#bd93f9', colors: ['#282a36', '#44475a'] },
    { id: 'paper', label: 'Papiro', accent: '#d6d3d1', colors: ['#1c1917', '#292524'] },
    { id: 'high-contrast', label: 'Alto Contraste', accent: '#ffff00', colors: ['#000000', '#ffffff'] },
];

// Lazy Font Mapping
const FONT_URLS: Record<string, string> = {
    'gothic': 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&display=swap',
    'confidential': 'https://fonts.googleapis.com/css2?family=Special+Elite&display=swap',
    'cosmic': 'https://fonts.googleapis.com/css2?family=Nosifer&display=swap',
    'executive': 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap',
    'admin_sci_fi': 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Cinzel:wght@400;500;600;700;800;900&display=swap', // For Admin & Shadow Monarch
    'japanese': 'https://fonts.googleapis.com/css2?family=Sawarabi+Mincho&display=swap'
};

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
    
    loadFontProfile: (profileKey: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
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

    const applyAccentToDOM = (color: string) => {
        document.documentElement.style.setProperty('--brand-color', color);
        document.documentElement.style.setProperty('--brand-rgb', hexToRgb(color));
    };

    // Helper to Lazy Load Fonts
    const loadFont = useCallback((url: string) => {
        if (!document.querySelector(`link[href="${url}"]`)) {
            const link = document.createElement('link');
            link.href = url;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    }, []);

    const loadFontProfile = useCallback((profileKey: string) => {
        if (FONT_URLS[profileKey]) {
            loadFont(FONT_URLS[profileKey]);
        }
    }, [loadFont]);

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

    // Apply High Contrast Text class to HTML
    useEffect(() => {
        const root = document.documentElement;
        if (isHighContrastText) {
            root.classList.add('high-contrast-text');
        } else {
            root.classList.remove('high-contrast-text');
        }
    }, [isHighContrastText]);

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

    // Theme & Font Application Logic
    useEffect(() => {
        const root = window.document.documentElement;
        PRESET_THEMES.forEach(p => root.classList.remove(p.id));
        root.classList.add(theme);
        root.classList.add('dark');
        
        const body = document.body;
        body.classList.remove('font-gothic', 'font-confidential', 'font-cosmic', 'font-executive');
        
        if (fontProfile !== 'standard') {
            body.classList.add(`font-${fontProfile}`);
            // Lazy load the requested font
            loadFontProfile(fontProfile);
        }

        // Special case: Load 'admin_sci_fi' fonts if theme is 'shadow-monarch' (Solo Leveling style)
        if (theme === 'shadow-monarch') {
            loadFontProfile('admin_sci_fi');
        }
        
        localStorage.setItem('app-theme', theme);
    }, [theme, fontProfile, loadFontProfile]);

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

    const toggleHighContrastText = (value: boolean) => {
        setIsHighContrastText(value);
        localStorage.setItem('app-high-contrast-text', String(value));
    }

    const applyThemePreset = (presetId: Theme) => {
        setTheme(presetId);
        const preset = PRESET_THEMES.find(p => p.id === presetId);
        if (preset) {
            setAccentColor(preset.accent);
        }
        if (presetId === 'high-contrast') {
            toggleHighContrastText(true);
        }
    };

    const value = { 
        theme, setTheme, applyThemePreset,
        isHighContrastText, setIsHighContrastText: toggleHighContrastText,
        wallpaper, globalTheme, 
        enableWallpaperMask, setEnableWallpaperMask, 
        enableFocusMode, setEnableFocusMode,
        updateWallpaper: updateWallpaperState, removeWallpaper: removeWallpaperState,
        accentColor, setAccentColor,
        fontProfile, setFontProfile,
        loadFontProfile
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
