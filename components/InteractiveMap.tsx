
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { TeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { StudentAcademicContext } from '../contexts/StudentAcademicContext';
import { SpinnerIcon, ICONS } from '../constants/index';
import type { HistoricalEra, Module, Activity } from '../types';

// --- Configuration ---

const DEFAULT_BACKGROUNDS: Record<HistoricalEra, string[]> = {
    'Antiga': ['https://images.unsplash.com/photo-1599739291060-4578e77dac5d?q=80&w=1600&auto=format&fit=crop'],
    'Média': ['https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=1600&auto=format&fit=crop'],
    'Moderna': ['https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1600&auto=format&fit=crop'],
    'Contemporânea': ['https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=1600&auto=format&fit=crop'],
};

// Color Palettes for Gradient Interpolation
const ERA_PALETTES: Record<HistoricalEra, { start: string, end: string }> = {
    'Antiga': { start: '#FFD700', end: '#FFF59D' }, // Gold -> Pastel Yellow
    'Média': { start: '#D1C4E9', end: '#D500F9' }, // Pastel Purple -> Neon Purple
    'Moderna': { start: '#C62828', end: '#F48FB1' }, // Imperial Red -> Pinkish
    'Contemporânea': { start: '#80CBC4', end: '#004D40' }, // Aqua -> Intense Teal
};

interface TimelineItem {
    id: string;
    type: 'module' | 'activity';
    title: string;
    year: number;
    era: HistoricalEra;
    data: Module | Activity;
}

// --- Helpers ---

// Linear Interpolation for Colors
const interpolateColor = (color1: string, color2: string, factor: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color1);
    const result2 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color2);
    
    if (!result || !result2) return color1;

    const r1 = parseInt(result[1], 16);
    const g1 = parseInt(result[2], 16);
    const b1 = parseInt(result[3], 16);

    const r2 = parseInt(result2[1], 16);
    const g2 = parseInt(result2[2], 16);
    const b2 = parseInt(result2[3], 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const getItemColor = (era: HistoricalEra, index: number, total: number) => {
    const palette = ERA_PALETTES[era];
    if (!palette) return '#FFFFFF';
    if (total <= 1) return palette.start;
    
    const factor = index / (total - 1);
    return interpolateColor(palette.start, palette.end, factor);
};

// --- Components ---

const EraSection: React.FC<{
    era: HistoricalEra;
    items: TimelineItem[];
    backgroundImages: string[];
    onItemClick: (item: TimelineItem) => void;
    onAddBackground: (era: HistoricalEra, url: string) => void;
    onRemoveBackground: (era: HistoricalEra, index: number) => void;
    canEdit: boolean;
}> = ({ era, items, backgroundImages, onItemClick, onAddBackground, onRemoveBackground, canEdit }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [bgInput, setBgInput] = useState('');
    const [isEditingBg, setIsEditingBg] = useState(false);

    // Dynamic width calculation: 
    // Minimum 800px or items * 280px (enough space for cards not to overlap)
    const sectionWidth = Math.max(800, items.length * 280);

    const handleAddBg = () => {
        if (bgInput) {
            onAddBackground(era, bgInput);
            setBgInput('');
        }
    };

    return (
        <div 
            className="relative flex-shrink-0 h-full border-r-2 border-white/20 overflow-hidden group transition-all duration-500"
            style={{ width: `${sectionWidth}px` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Background Layer (Multi-Image Tiling) */}
            <div className="absolute inset-0 flex pointer-events-none">
                {backgroundImages.map((img, idx) => (
                    <div 
                        key={idx} 
                        className="h-full flex-1 relative overflow-hidden"
                    >
                        <div 
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out group-hover:scale-105"
                            style={{ backgroundImage: `url(${img})` }}
                        />
                        {/* Admin remove overlay */}
                        {canEdit && isEditingBg && backgroundImages.length > 1 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRemoveBackground(era, idx); }}
                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 shadow-md pointer-events-auto hover:bg-red-700 z-50"
                                title="Remover esta imagem de fundo"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors duration-500 pointer-events-none" />

            {/* Era Title & Controls */}
            <div className="absolute top-6 left-6 z-30">
                <h2 className="text-5xl font-bold text-white font-epic tracking-widest uppercase opacity-90 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                    {era}
                </h2>
                {canEdit && (
                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-start gap-2">
                        <button 
                            onClick={() => setIsEditingBg(!isEditingBg)}
                            className="text-xs bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded backdrop-blur-md transition-colors border border-white/20"
                        >
                            {isEditingBg ? 'Fechar Editor' : 'Gerenciar Fundos'}
                        </button>
                        
                        {isEditingBg && (
                            <div className="bg-black/80 p-3 rounded-lg border border-white/20 shadow-xl w-64 backdrop-blur-md">
                                <p className="text-xs text-gray-300 mb-2">Adicionar imagem reserva (estende o fundo):</p>
                                <div className="flex gap-2 mb-2">
                                    <input 
                                        type="text" 
                                        placeholder="URL da Imagem..." 
                                        className="flex-1 text-xs p-1.5 rounded bg-white/10 text-white border border-white/30 focus:outline-none focus:border-indigo-500"
                                        value={bgInput}
                                        onChange={(e) => setBgInput(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleAddBg} 
                                        className="text-xs bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded text-white font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 italic">Dica: Adicione mais imagens para evitar distorção quando a linha do tempo crescer.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Timeline Horizontal Line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/20 pointer-events-none" />

            {/* Items Container */}
            <div className="absolute top-0 bottom-0 left-0 right-0 flex items-center px-12 gap-20 overflow-visible">
                {items.length === 0 ? (
                    <div className="text-white/30 text-sm italic mt-24 ml-4 pointer-events-none">
                        Adicione conteúdo com ano histórico para aparecer aqui.
                    </div>
                ) : (
                    items.map((item, index) => {
                        const isTop = index % 2 === 0;
                        const anchorColor = getItemColor(era, index, items.length);
                        const coverImage = (item.data as any).coverImageUrl || (item.data as any).imageUrl;

                        return (
                            <div key={item.id} className="relative group/node flex-shrink-0 flex flex-col items-center justify-center w-12">
                                
                                {/* Vertical Connector Line */}
                                <div 
                                    className={`absolute left-1/2 w-0.5 bg-white/40 h-20 -translate-x-1/2 transition-all duration-300 group-hover/node:bg-white/80 ${isTop ? 'bottom-1/2 origin-bottom' : 'top-1/2 origin-top'}`} 
                                />

                                {/* Anchor Point (Now with Image) */}
                                <div 
                                    className="w-14 h-14 rounded-full border-[3px] z-20 relative cursor-pointer transition-all duration-300 transform group-hover/node:scale-125 group-hover/node:shadow-[0_0_20px_rgba(255,255,255,0.6)] bg-slate-900 overflow-hidden"
                                    style={{ borderColor: anchorColor }}
                                    onClick={() => onItemClick(item)}
                                >
                                    {coverImage ? (
                                        <img src={coverImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                            <div className="w-2 h-2 rounded-full bg-white opacity-50" />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Year Label (On the line) */}
                                <div className={`absolute left-1/2 -translate-x-1/2 text-white/80 font-bold text-xs bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm z-20 ${isTop ? 'top-[calc(50%+24px)]' : 'bottom-[calc(50%+24px)]'}`}>
                                    {item.year > 0 ? item.year : `${Math.abs(item.year)} a.C.`}
                                </div>

                                {/* Content Card */}
                                <div 
                                    onClick={() => onItemClick(item)}
                                    className={`absolute left-1/2 -translate-x-1/2 w-56 p-4 bg-slate-900/90 backdrop-blur-xl rounded-xl shadow-2xl cursor-pointer hover:bg-slate-800 transition-all duration-300 transform hover:scale-105 border border-slate-700 z-30 ${isTop ? '-top-48' : 'top-28'}`}
                                >
                                    {/* Triangle pointer */}
                                    <div className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900/90 rotate-45 border-slate-700 ${isTop ? '-bottom-2 border-b border-r' : '-top-2 border-t border-l'}`} />

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-2">
                                            <span 
                                                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded text-slate-900"
                                                style={{ backgroundColor: anchorColor }}
                                            >
                                                {item.type === 'module' ? 'Módulo' : 'Atividade'}
                                            </span>
                                            {/* Preview Dot for color */}
                                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: anchorColor, boxShadow: `0 0 8px ${anchorColor}` }} />
                                        </div>
                                        <h4 className="text-base font-bold text-white line-clamp-2 leading-snug mb-1">
                                            {item.title}
                                        </h4>
                                        <p className="text-xs text-slate-400 line-clamp-2">
                                            {(item.data as any).description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const InteractiveMap: React.FC = () => {
    const { userRole } = useAuth();
    const { startModule, openActivity } = useNavigation();
    
    const teacherContext = useContext(TeacherAcademicContext);
    const studentContext = useContext(StudentAcademicContext);

    const [backgrounds, setBackgrounds] = useState<Record<HistoricalEra, string[]>>({
        'Antiga': DEFAULT_BACKGROUNDS['Antiga'],
        'Média': DEFAULT_BACKGROUNDS['Média'],
        'Moderna': DEFAULT_BACKGROUNDS['Moderna'],
        'Contemporânea': DEFAULT_BACKGROUNDS['Contemporânea'],
    });

    // Migrate old local storage format (string) to new format (string[]) if necessary
    useEffect(() => {
        const savedBgs = localStorage.getItem('timeline_backgrounds_v2');
        if (savedBgs) {
            try {
                setBackgrounds(JSON.parse(savedBgs));
            } catch (e) { console.error("Error loading backgrounds", e); }
        } else {
            // Check for legacy V1 format
            const legacyBgs = localStorage.getItem('timeline_backgrounds');
            if (legacyBgs) {
                try {
                    const parsed = JSON.parse(legacyBgs);
                    const migrated: any = {};
                    Object.keys(parsed).forEach(key => {
                        migrated[key] = [parsed[key]];
                    });
                    setBackgrounds({ ...DEFAULT_BACKGROUNDS, ...migrated });
                } catch (e) {}
            }
        }
    }, []);

    const saveBackgrounds = (newBgs: Record<HistoricalEra, string[]>) => {
        setBackgrounds(newBgs);
        localStorage.setItem('timeline_backgrounds_v2', JSON.stringify(newBgs));
    };

    // Initial Data Fetching for Teachers
    useEffect(() => {
        if (userRole === 'professor' && teacherContext) {
            if (teacherContext.modules.length === 0) {
                teacherContext.fetchModulesLibrary();
            }
        }
    }, [userRole, teacherContext]); 

    // Calculate Items Memoized
    const timelineItems = useMemo(() => {
        let modules: Module[] = [];
        let activities: Activity[] = [];

        if (userRole === 'professor' && teacherContext) {
            modules = teacherContext.modules;
        } else if (userRole === 'aluno' && studentContext) {
            studentContext.studentClasses.forEach(cls => {
                modules.push(...cls.modules);
                activities.push(...cls.activities);
            });
            // Dedup items
            modules = Array.from(new Map(modules.map(m => [m.id, m])).values());
            activities = Array.from(new Map(activities.map(a => [a.id, a])).values());
        }

        const items: TimelineItem[] = [];

        modules.forEach(m => {
            if (m.historicalYear !== undefined && m.historicalEra) {
                items.push({
                    id: m.id,
                    type: 'module',
                    title: m.title,
                    year: m.historicalYear,
                    era: m.historicalEra,
                    data: m
                });
            }
        });

        activities.forEach(a => {
            if (a.historicalYear !== undefined && a.historicalEra) {
                items.push({
                    id: a.id,
                    type: 'activity',
                    title: a.title,
                    year: a.historicalYear,
                    era: a.historicalEra,
                    data: a
                });
            }
        });

        return items.sort((a, b) => a.year - b.year);
    }, [userRole, teacherContext?.modules, studentContext?.studentClasses]);

    const handleAddBackground = (era: HistoricalEra, url: string) => {
        const currentUrls = backgrounds[era] || [];
        const newBgs = { ...backgrounds, [era]: [...currentUrls, url] };
        saveBackgrounds(newBgs);
    };

    const handleRemoveBackground = (era: HistoricalEra, index: number) => {
        const currentUrls = backgrounds[era];
        if (currentUrls.length <= 1) {
            alert("Você precisa ter pelo menos uma imagem de fundo.");
            return;
        }
        const newUrls = currentUrls.filter((_, i) => i !== index);
        const newBgs = { ...backgrounds, [era]: newUrls };
        saveBackgrounds(newBgs);
    };

    const handleItemClick = (item: TimelineItem) => {
        if (item.type === 'module') {
            startModule(item.data as Module);
        } else {
            openActivity(item.data as Activity);
        }
    };

    const eras: HistoricalEra[] = ['Antiga', 'Média', 'Moderna', 'Contemporânea'];
    const isLoading = userRole === 'aluno' ? studentContext?.isLoading : teacherContext?.isLoadingContent;
    const canEdit = userRole === 'admin'; // Only Admin can change backgrounds

    if (isLoading && timelineItems.length === 0) {
         return (
            <div className="h-[calc(100vh-6rem)] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <SpinnerIcon className="h-12 w-12 text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-6rem)] w-full overflow-x-auto overflow-y-hidden bg-slate-950 border border-slate-800 rounded-xl shadow-2xl relative scroll-smooth">
            <div className="flex h-full w-max">
                {eras.map(era => (
                    <EraSection 
                        key={era}
                        era={era}
                        items={timelineItems.filter(i => i.era === era)}
                        backgroundImages={backgrounds[era]}
                        onItemClick={handleItemClick}
                        onAddBackground={handleAddBackground}
                        onRemoveBackground={handleRemoveBackground}
                        canEdit={canEdit}
                    />
                ))}
            </div>
            
            <div className="fixed bottom-8 left-8 bg-black/80 backdrop-blur-md p-4 rounded-lg border border-white/20 text-white text-xs z-40 max-w-xs shadow-xl">
                <h3 className="font-bold mb-2 uppercase tracking-wider text-indigo-400 flex items-center">
                    <span className="text-lg mr-2">🧭</span> Navegação Temporal
                </h3>
                <p>Role horizontalmente para viajar pela história. Os pontos mudam de cor conforme o tempo avança.</p>
            </div>
        </div>
    );
};

export default InteractiveMap;
