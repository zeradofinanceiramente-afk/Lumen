
import React, { useState, useMemo, useEffect, useContext, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { TeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { StudentAcademicContext } from '../contexts/StudentAcademicContext';
import { SpinnerIcon } from '../constants/index';
import type { HistoricalEra, Module, Activity } from '../types';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';

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

const TimelineNode: React.FC<{
    item: TimelineItem;
    index: number;
    total: number;
    onClick: (item: TimelineItem) => void;
    era: HistoricalEra;
}> = React.memo(({ item, index, total, onClick, era }) => {
    // 3D Depth Logic - Staggered layout
    // 0 = Close, 1 = Mid, 2 = Far
    const depthIndex = index % 3;
    
    // Z-Index: Closer items must be on top
    const zIndex = 100 - depthIndex * 10;

    // Transform Z logic for visual depth
    // The deeper the item, the smaller it scales and moves up (simulating horizon)
    const zTransform = depthIndex === 0 ? 0 : depthIndex === 1 ? -100 : -200;
    const yOffset = depthIndex === 0 ? 0 : depthIndex === 1 ? -40 : -80; // More vertical spacing
    const blur = depthIndex === 2 ? 'blur-[1px]' : 'blur-none';
    const opacity = depthIndex === 2 ? 'opacity-80' : 'opacity-100';

    const anchorColor = getItemColor(era, index, total);
    const coverImage = (item.data as any).coverImageUrl || (item.data as any).imageUrl;

    return (
        <div 
            className={`absolute bottom-0 w-20 flex flex-col items-center justify-end transition-all duration-500 ease-out group/node ${blur} ${opacity}`}
            style={{ 
                left: `${index * 300 + 150}px`, // Increased horizontal spacing
                zIndex,
                transform: `translate3d(0, ${yOffset}px, ${zTransform}px)`,
                height: '350px' // Fixed height container to allow line to reach bottom
            }}
        >
            {/* 3D Connector Line (Tether) */}
            <div 
                className="absolute bottom-0 left-1/2 w-[2px] origin-bottom bg-gradient-to-t from-white via-white/40 to-transparent transition-all duration-500 group-hover/node:w-[3px] group-hover/node:from-indigo-400 group-hover/node:via-indigo-300/50"
                style={{ 
                    height: '100%', 
                    transform: 'translateX(-50%)',
                    boxShadow: '0 0 10px rgba(255,255,255,0.2)'
                }}
            />

            {/* Anchor Point (On the Timeline Axis) */}
            <div 
                className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-4 bg-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.8)] cursor-pointer transition-transform duration-300 group-hover/node:scale-125 group-hover/node:bg-white z-50 hover:shadow-[0_0_30px_#fff]"
                style={{ borderColor: anchorColor }}
                onClick={(e) => { e.stopPropagation(); onClick(item); }}
            >
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-white/90 bg-black/70 px-2 py-0.5 rounded whitespace-nowrap group-hover/node:text-white group-hover/node:bg-indigo-600 transition-colors border border-white/10">
                    {item.year > 0 ? item.year : `${Math.abs(item.year)} a.C.`}
                </div>
            </div>

            {/* Floating Card */}
            <div 
                onClick={(e) => { e.stopPropagation(); onClick(item); }}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-64 bg-slate-900/90 backdrop-blur-xl rounded-xl shadow-2xl cursor-pointer border border-white/10 overflow-hidden ring-1 ring-white/5 group-hover/node:ring-indigo-400/50 group-hover/node:shadow-[0_0_50px_rgba(79,70,229,0.3)] group-hover/node:scale-105 group-hover/node:-translate-y-2 transition-all duration-300 origin-bottom"
            >
                {/* Image Area */}
                {coverImage && (
                    <div className="h-32 w-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
                        <img 
                            src={coverImage} 
                            alt="" 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover/node:scale-110" 
                        />
                        <div className="absolute top-2 right-2 z-20">
                            <span 
                                className="text-[9px] uppercase font-bold px-2 py-0.5 rounded text-slate-900 shadow-sm border border-white/20"
                                style={{ backgroundColor: anchorColor }}
                            >
                                {item.type === 'module' ? 'Módulo' : 'Atividade'}
                            </span>
                        </div>
                    </div>
                )}

                <div className={`p-4 relative z-20 ${coverImage ? '-mt-8' : ''}`}>
                    <h4 className="text-sm font-bold text-white leading-tight mb-1 drop-shadow-md group-hover/node:text-indigo-200 transition-colors">
                        {item.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {(item.data as any).description}
                    </p>
                </div>
            </div>
        </div>
    );
});

const BackgroundLayer: React.FC<{
    eraSections: { era: HistoricalEra, left: number, width: number }[];
    backgrounds: Record<HistoricalEra, string[]>;
    cameraX: number;
    totalWidth: number;
}> = ({ eraSections, backgrounds, cameraX, totalWidth }) => {
    // Parallax Factor: Controls how fast the background moves relative to the camera
    // 0.2 means background moves at 20% speed of foreground
    const parallaxFactor = 0.2;
    const bgOffset = -(cameraX * parallaxFactor);

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
            {/* We create a container that is wide enough to hold all backgrounds */}
            <div 
                className="absolute top-0 bottom-0 flex will-change-transform"
                style={{ 
                    transform: `translateX(${bgOffset}px)`,
                    width: `${totalWidth}px` // Ensure it spans properly
                }}
            >
                {eraSections.map(section => (
                    <div 
                        key={section.era}
                        className="relative h-full border-r border-white/5"
                        style={{ width: `${section.width}px` }}
                    >
                        {/* Background Image(s) */}
                        <div className="absolute inset-0 flex">
                            {backgrounds[section.era]?.map((img, idx) => (
                                <div 
                                    key={idx} 
                                    className="h-full flex-1 bg-cover bg-center opacity-30"
                                    style={{ backgroundImage: `url(${img})` }}
                                />
                            ))}
                        </div>
                        
                        {/* Overlay Gradients for Depth */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900/50 to-black/80" />
                        
                        {/* Huge Era Title in Background */}
                        <div className="absolute top-20 left-10 opacity-10">
                            <h2 className="text-[12rem] font-bold text-white font-epic tracking-widest uppercase leading-none select-none whitespace-nowrap">
                                {section.era}
                            </h2>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const InteractiveMap: React.FC = () => {
    const { userRole } = useAuth();
    const { startModule, openActivity } = useNavigation();
    
    const teacherContext = useContext(TeacherAcademicContext);
    const studentContext = useContext(StudentAcademicContext);

    const [backgrounds, setBackgrounds] = useState<Record<HistoricalEra, string[]>>(DEFAULT_BACKGROUNDS);
    const [publicModules, setPublicModules] = useState<Module[]>([]);
    const [isLoadingPublic, setIsLoadingPublic] = useState(false);

    // --- Virtual Camera State ---
    const viewportRef = useRef<HTMLDivElement>(null);
    const [cameraX, setCameraX] = useState(0);
    const [zoom, setZoom] = useState(1);
    
    // Gestures State
    const [isDragging, setIsDragging] = useState(false);
    const lastX = useRef(0);
    const lastTouchDistance = useRef<number | null>(null);

    // Constraints
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 1.8;
    
    // Data Loading (Backgrounds from Firestore)
    useEffect(() => {
        const fetchBackgrounds = async () => {
            try {
                const docRef = doc(db, 'system_settings', 'timeline_backgrounds');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    const mergedBgs = { ...DEFAULT_BACKGROUNDS };
                    
                    ['Antiga', 'Média', 'Moderna', 'Contemporânea'].forEach(era => {
                        // Check if exists and has valid content
                        if (data[era] && Array.isArray(data[era]) && data[era].length > 0 && data[era][0] !== '') {
                            mergedBgs[era as HistoricalEra] = data[era];
                        }
                    });
                    setBackgrounds(mergedBgs);
                }
            } catch (err) {
                console.error("Failed to load map backgrounds", err);
            }
        };
        fetchBackgrounds();
    }, []);

    useEffect(() => {
        if (userRole === 'professor' && teacherContext?.modules.length === 0) {
            teacherContext.fetchModulesLibrary();
        }
    }, [userRole, teacherContext]);

    useEffect(() => {
        if (userRole === 'aluno') {
            setIsLoadingPublic(true);
            const q = query(collection(db, "modules"), where("status", "==", "Ativo"), where("visibility", "==", "public"));
            getDocs(q).then(snap => {
                setPublicModules(snap.docs.map(d => ({ id: d.id, ...d.data() } as Module)));
            }).finally(() => setIsLoadingPublic(false));
        }
    }, [userRole]);

    // Calculate Items & Sections
    const { eraSections } = useMemo(() => {
        let modules: Module[] = [];
        let activities: Activity[] = [];

        if (userRole === 'professor' && teacherContext) {
            modules = teacherContext.modules;
        } else if (userRole === 'aluno' && studentContext) {
            studentContext.studentClasses.forEach(cls => {
                if (Array.isArray(cls.modules)) modules.push(...cls.modules);
                if (Array.isArray(cls.activities)) activities.push(...cls.activities);
            });
            modules.push(...publicModules);
            // Remove duplicates
            modules = Array.from(new Map(modules.map(m => [m.id, m])).values());
            activities = Array.from(new Map(activities.map(a => [a.id, a])).values());
        }

        const items: TimelineItem[] = [];
        const pushItem = (obj: any, type: 'module' | 'activity') => {
            if (obj.historicalYear !== undefined && obj.historicalEra) {
                items.push({ id: obj.id, type, title: obj.title, year: obj.historicalYear, era: obj.historicalEra, data: obj });
            }
        };
        modules.forEach(m => pushItem(m, 'module'));
        activities.forEach(a => pushItem(a, 'activity'));
        items.sort((a, b) => a.year - b.year);

        // Calculate layout
        const sections: { era: HistoricalEra, left: number, width: number, items: TimelineItem[] }[] = [];
        let currentLeft = 0;
        const ERAS: HistoricalEra[] = ['Antiga', 'Média', 'Moderna', 'Contemporânea'];

        ERAS.forEach(era => {
            const eraItems = items.filter(i => i.era === era);
            const width = Math.max(1200, eraItems.length * 300 + 400); // Minimum width + item spacing
            sections.push({ era, left: currentLeft, width, items: eraItems });
            currentLeft += width;
        });

        return { timelineItems: items, eraSections: sections };
    }, [userRole, teacherContext?.modules, studentContext?.studentClasses, publicModules]);

    const totalWidth = eraSections.reduce((acc, s) => acc + s.width, 0);

    // --- Gesture Handlers ---

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.ctrlKey) {
            // Pinch to zoom (trackpad)
            const zoomDelta = -e.deltaY * 0.005;
            setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + zoomDelta)));
        } else {
            // Pan
            setCameraX(x => Math.min(Math.max(0, x + e.deltaY + e.deltaX), totalWidth - window.innerWidth / zoom));
        }
    }, [totalWidth, zoom]);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            lastX.current = e.touches[0].clientX;
        } else if (e.touches.length === 2) {
            // Pinch start
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            lastTouchDistance.current = dist;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault(); // Critical for isolation
        e.stopPropagation();

        if (e.touches.length === 1 && isDragging) {
            const deltaX = lastX.current - e.touches[0].clientX;
            lastX.current = e.touches[0].clientX;
            setCameraX(x => Math.min(Math.max(0, x + deltaX), totalWidth - window.innerWidth / zoom));
        } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = dist - lastTouchDistance.current;
            lastTouchDistance.current = dist;
            
            const zoomSpeed = 0.005;
            setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta * zoomSpeed)));
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        lastTouchDistance.current = null;
    };

    // Attach non-passive wheel listener for full control
    useEffect(() => {
        const el = viewportRef.current;
        if (el) {
            el.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
            if (el) el.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]);

    const handleItemClick = (item: TimelineItem) => {
        if (item.type === 'module') startModule(item.data as Module);
        else openActivity(item.data as Activity);
    };

    const isLoading = (userRole === 'aluno' ? studentContext?.isLoading : teacherContext?.isLoadingContent) || isLoadingPublic;

    if (isLoading && totalWidth === 0) {
        return <div className="h-[80vh] w-full flex items-center justify-center"><SpinnerIcon className="h-12 w-12 text-indigo-500" /></div>;
    }

    return (
        <div 
            ref={viewportRef}
            className="h-[calc(100vh-6rem)] w-full relative overflow-hidden bg-black select-none touch-none rounded-xl shadow-2xl border border-slate-800"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
            {/* UI Overlay (Static) */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-4 bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/10 text-white pointer-events-auto">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-gray-400 font-bold">Zoom</span>
                    <span className="font-mono text-sm">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="h-8 w-[1px] bg-white/20" />
                <button 
                    onClick={() => { setZoom(1); setCameraX(0); }}
                    className="ml-2 p-1 hover:bg-white/20 rounded text-xs"
                    title="Resetar Câmera"
                >
                    Reset
                </button>
            </div>

            {/* LAYER 1: Background (Parallax Only, No Zoom) */}
            <BackgroundLayer 
                eraSections={eraSections} 
                backgrounds={backgrounds} 
                cameraX={cameraX} 
                totalWidth={totalWidth} 
            />

            {/* LAYER 2: World Content (Zoom + Pan) */}
            <div 
                className="absolute inset-0 w-full h-full will-change-transform origin-top-left z-10"
                style={{
                    transform: `translateX(${-cameraX}px) scale(${zoom})`,
                    width: `${totalWidth}px`
                }}
            >
                {/* 2.1 Floor Grid */}
                <div 
                    className="absolute bottom-0 left-0 right-0 h-[300px] z-10 pointer-events-none"
                    style={{
                        background: `
                            linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 20%, #000 100%),
                            repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 150px),
                            repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 50px)
                        `,
                        transform: 'perspective(800px) rotateX(40deg) scale(1.5)',
                        transformOrigin: 'bottom center',
                        width: '100%'
                    }}
                />

                {/* 2.2 THE TIMELINE AXIS (The central line) */}
                <div 
                    className="absolute bottom-[30px] left-0 right-0 h-[4px] z-20 pointer-events-none bg-indigo-500/50 shadow-[0_0_20px_#6366f1]"
                    style={{
                        background: 'linear-gradient(90deg, transparent 0%, #6366f1 10%, #a855f7 50%, #6366f1 90%, transparent 100%)',
                        width: `${totalWidth}px`
                    }}
                />

                {/* 2.3 Items Layer (Mapped strictly to avoid duplicates) */}
                <div className="absolute top-0 bottom-[34px] left-0 right-0 z-30 pointer-events-none" style={{ perspective: '1000px' }}>
                    {eraSections.map(section => (
                        <div key={section.era} className="absolute top-0 bottom-0 pointer-events-auto" style={{ left: section.left, width: section.width }}>
                            {section.items.map((item, idx) => (
                                <TimelineNode 
                                    key={item.id}
                                    item={item}
                                    index={idx}
                                    total={section.items.length}
                                    onClick={handleItemClick}
                                    era={section.era}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Gesture Hint */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none opacity-50 text-white text-xs font-mono animate-pulse z-50">
                PINCH TO ZOOM • DRAG TO PAN
            </div>
        </div>
    );
};

export default InteractiveMap;
