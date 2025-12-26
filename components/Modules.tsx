import React, { useState, useMemo, useEffect, useContext } from 'react';
import type { Module, ModuleDownloadState } from '../types';
import { Card } from './common/Card';
import { SpinnerIcon, SCHOOL_YEARS, SUBJECTS_LIST } from '../constants/index';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
// Imports diretos dos Contextos para evitar erro de Hook fora do Provider
import { StudentAcademicContext } from '../contexts/StudentAcademicContext';
import { TeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { saveModuleOffline, removeModuleOffline, listOfflineModules } from '../utils/offlineManager';
import { useToast } from '../contexts/ToastContext';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, limit, startAfter, doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { Modal } from './common/Modal'; // Importando componente Modal existente
import { getSubjectTheme } from '../utils/subjectTheme';

// Helper para cores de Status (Alinhado com Quizzes)
const getStatusColor = (status: string) => {
    switch (status) {
        case 'completed': // Concluído -> Verde
            return 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]';
        case 'in_progress': // Em andamento -> Azul
            return 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.3)]';
        case 'not_started': // Não iniciado -> Amarelo/Cinza
            return 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]';
        case 'all':
        default:
            return 'bg-slate-500/10 border-slate-500/50 text-slate-400';
    }
};

// Componente Helper para Botão de Filtro Estilo GitHub Tag (Atualizado com customColorClass)
const FilterChip: React.FC<{ 
    label: string; 
    value: string; 
    isActive: boolean; 
    onClick: () => void; 
    customColorClass?: string;
}> = ({ label, value, isActive, onClick, customColorClass }) => {
    
    // Fallback style if no custom color provided but active
    const defaultActiveStyle = 'bg-brand/10 border-brand text-brand shadow-[0_0_15px_rgba(var(--brand-rgb),0.2)]';
    const activeStyle = customColorClass || defaultActiveStyle;

    return (
        <button 
            onClick={onClick}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2 ${
                isActive 
                    ? activeStyle
                    : 'bg-black/40 border-white/80 text-slate-200 hover:bg-white/5 hover:text-white hover:border-white'
            }`}
        >
            <span className="opacity-60 font-normal">{label}:</span>
            <span className="truncate max-w-[120px]">{value === 'all' ? 'Todos' : value === 'not_started' ? 'Não Iniciado' : value === 'in_progress' ? 'Em Andamento' : value === 'completed' ? 'Concluído' : value}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </button>
    );
};

// Helper para cores de Série
const getSeriesColor = (series: string | string[] | undefined) => {
    const s = Array.isArray(series) ? series[0] : (series || '');
    if (!s || s === 'all') return undefined;
    
    if (s.includes('6º')) return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
    if (s.includes('7º')) return 'text-teal-400 border-teal-400/30 bg-teal-400/10';
    if (s.includes('8º')) return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
    if (s.includes('9º')) return 'text-lime-400 border-lime-400/30 bg-lime-400/10';
    if (s.includes('1º')) return 'text-indigo-400 border-indigo-400/30 bg-indigo-400/10';
    if (s.includes('2º')) return 'text-violet-400 border-violet-400/30 bg-violet-400/10';
    if (s.includes('3º')) return 'text-fuchsia-400 border-fuchsia-400/30 bg-fuchsia-400/10';
    
    return 'text-slate-400 border-slate-400/30 bg-slate-400/10';
};

const ModuleCard: React.FC<{ 
    module: Module; 
    onStartModule: (module: Module) => void; 
    downloadState: ModuleDownloadState;
    onToggleDownload: (module: Module) => void;
}> = React.memo(({ module, onStartModule, downloadState, onToggleDownload }) => {
    
    const isCompleted = module.progress === 100;
    const progress = module.progress || 0;

    // Data formatada estilo "commit date"
    const dateStr = module.date ? new Date(module.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'N/D';

    // Tema da Matéria
    const theme = getSubjectTheme(module.materia);
    
    // Cor da Série
    const seriesColor = getSeriesColor(module.series) || 'text-slate-400 border-slate-400/30 bg-slate-400/10';

    return (
        <div 
            onClick={() => onStartModule(module)}
            className={`group relative flex flex-col bg-black/40 border border-white/10 rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:bg-black/60 hover:${theme.border} hover:border-opacity-50 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:-translate-y-1 backdrop-blur-sm`}
            role="article"
            aria-label={`Módulo ${module.title}`}
            tabIndex={0}
        >
            {/* Header Image Area */}
            <div className="relative h-36 w-full bg-[#050505] overflow-hidden border-b border-white/5">
                {module.coverImageUrl ? (
                    <img 
                        src={module.coverImageUrl} 
                        alt="" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" 
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                )}
                
                {/* Download Button (Top Right) */}
                <div className="absolute top-2 right-2 z-20">
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleDownload(module);
                        }}
                        disabled={downloadState === 'downloading'}
                        className={`p-1.5 rounded-lg backdrop-blur-md transition-all border text-xs font-mono flex items-center justify-center gap-1 ${
                            downloadState === 'downloaded' 
                                ? 'bg-black text-green-400 border-green-500 shadow-[0_0_10px_rgba(74,222,128,0.5)] hover:bg-red-950 hover:text-red-500 hover:border-red-500 hover:shadow-none' 
                                : 'bg-black/60 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                        title={downloadState === 'downloaded' ? "Remover offline" : "Baixar para offline"}
                    >
                        {downloadState === 'downloading' ? (
                            <SpinnerIcon className="h-3 w-3" />
                        ) : downloadState === 'downloaded' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-5 flex flex-col flex-grow relative">
                
                {/* Title & Description */}
                <div className="mb-4">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="text-sm font-bold text-white transition-colors line-clamp-2 leading-tight">
                            {module.title}
                        </h3>
                    </div>
                    
                    {/* Metadata Row: Materia -> Série -> Data */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        {/* 1. Matéria */}
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${theme.bg} ${theme.text} ${theme.border}`}>
                            {Array.isArray(module.materia) ? module.materia[0] : module.materia}
                        </span>

                        {/* 2. Série */}
                        {module.series && (
                            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${seriesColor}`}>
                                {Array.isArray(module.series) ? module.series[0] : module.series}
                            </span>
                        )}

                        {/* 3. Data */}
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 ml-auto">
                            <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                            {dateStr}
                        </span>
                    </div>

                    <p className="text-xs text-slate-200 mt-2 line-clamp-2 font-medium leading-relaxed">
                        {module.description}
                    </p>
                </div>

                <div className="mt-auto space-y-3 pt-3 border-t border-white/5">
                    {/* Progress Bar (XP Style) */}
                    <div className="relative">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                            <span>PROGRESSO</span>
                            <span className={isCompleted ? 'text-green-400' : 'text-brand'}>{progress}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-brand shadow-[0_0_10px_var(--brand-color)]'}`} 
                                style={{ width: `${progress}%` }} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});


const Modules: React.FC = () => {
    const { user, userRole } = useAuth();
    const { addToast } = useToast();
    const { startModule } = useNavigation();
    
    // Contexts
    const studentContext = useContext(StudentAcademicContext);
    const teacherContext = useContext(TeacherAcademicContext);

    const isStudent = userRole === 'aluno' && !!studentContext;
    const isTeacher = userRole === 'professor' && !!teacherContext;

    const [searchScope, setSearchScope] = useState<'my_modules' | 'public'>('my_modules');
    
    // --- STAGING FILTERS (Inputs) ---
    const [filterInputs, setFilterInputs] = useState({
        searchTerm: '',
        serie: 'all',
        materia: 'all',
        status: 'all' as 'all' | 'not_started' | 'in_progress' | 'completed'
    });

    // --- MODAL STATE ---
    const [activeFilterModal, setActiveFilterModal] = useState<'serie' | 'materia' | 'status' | null>(null);

    // --- APPLIED FILTERS (Query Drivers) ---
    const [appliedFilters, setAppliedFilters] = useState(filterInputs);

    const [offlineStatus, setOfflineStatus] = useState<Record<string, ModuleDownloadState>>({});
    
    // --- Dynamic Colors Calculation ---
    const seriesActiveColor = filterInputs.serie !== 'all' ? getSeriesColor(filterInputs.serie) : undefined;
    const materiaTheme = getSubjectTheme(filterInputs.materia);
    const materiaActiveColor = filterInputs.materia !== 'all' ? `${materiaTheme.text} ${materiaTheme.border} ${materiaTheme.bg}` : undefined;
    const statusActiveColor = getStatusColor(filterInputs.status);

    useEffect(() => {
        const checkOffline = async () => {
            const offlineModules = await listOfflineModules();
            const statusMap: Record<string, ModuleDownloadState> = {};
            offlineModules.forEach(m => {
                statusMap[m.id] = 'downloaded';
            });
            setOfflineStatus(prev => ({ ...prev, ...statusMap }));
        };
        checkOffline();
    }, []);

    // Atualiza input e aplica imediatamente se mudar de aba
    useEffect(() => {
        setAppliedFilters(prev => ({ ...prev })); 
    }, [searchScope]);

    // Aplica filtros automaticamente quando inputs mudam (Reatividade tipo Quizzes)
    useEffect(() => {
        setAppliedFilters({ ...filterInputs });
    }, [filterInputs]);

    // FETCH FUNCTION FOR REACT QUERY
    const fetchModulesPage = async ({ pageParam }: { pageParam: string | null }) => {
        if (!user || !isStudent) return { modules: [], lastId: null };

        let q = query(collection(db, "modules"), where("status", "==", "Ativo"));

        if (searchScope === 'public') {
            q = query(q, where("visibility", "==", "public"));
        } else {
            const myClassIds = studentContext.studentClasses.map(c => c.id);
            if (myClassIds.length === 0) return { modules: [], lastId: null };
            
            const classIdsToQuery = myClassIds.slice(0, 10);
            q = query(q, where("classIds", "array-contains-any", classIdsToQuery));
        }

        // Apply Server-side filtering for Series based on APPLIED filters
        if (searchScope === 'public' && appliedFilters.serie !== 'all') {
             q = query(q, where("series", "array-contains", appliedFilters.serie));
        }

        q = query(q, limit(20));

        if (pageParam) {
            try {
                const cursorRef = doc(db, "modules", pageParam);
                const cursorSnap = await getDoc(cursorRef);
                if (cursorSnap.exists()) {
                    q = query(q, startAfter(cursorSnap));
                }
            } catch (e) {
                console.warn("Could not rehydrate pagination cursor", e);
            }
        }

        const snap = await getDocs(q);
        
        let results = snap.docs.map(d => {
            const data = d.data();
            return { 
                id: d.id, 
                ...data,
                date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
            } as Module;
        });

        // Fetch Progress
        const progressPromises = results.map(async (m) => {
            try {
                const progRef = doc(db, "users", user.id, "modulesProgress", m.id);
                const pSnap = await getDoc(progRef);
                return pSnap.exists() ? pSnap.data().progress : 0;
            } catch { return 0; }
        });
        const progressValues = await Promise.all(progressPromises);
        
        const finalModules: Module[] = results.map((m, i) => ({ ...m, progress: progressValues[i] }));

        return { 
            modules: finalModules, 
            lastId: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null 
        };
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status
    } = useInfiniteQuery({
        // Include APPLIED filters in queryKey to trigger refetch only on apply
        queryKey: ['modules', user?.id, searchScope, appliedFilters.serie], 
        queryFn: fetchModulesPage,
        getNextPageParam: (lastPage) => lastPage.lastId || undefined,
        initialPageParam: null,
        enabled: isStudent && !!user && !!studentContext
    });

    const flattenedModules = useMemo(() => {
        return data?.pages.flatMap(page => page.modules) || [];
    }, [data]);

    // --- CLIENT SIDE FILTERING (Cascade based on APPLIED filters) ---
    const displayedModules = useMemo(() => {
        let mods: Module[] = isStudent ? flattenedModules : [];
        
        if (isTeacher) {
             mods = teacherContext?.modules || [];
             if (searchScope === 'my_modules') {
                 mods = mods.filter(m => m.creatorId === user?.id);
             } else {
                 mods = mods.filter(m => m.visibility === 'public');
             }
        }
        
        // 1. Filter by Series
        if (appliedFilters.serie !== 'all') {
            mods = mods.filter(m => {
                const s = Array.isArray(m.series) ? m.series : [m.series];
                return s.includes(appliedFilters.serie);
            });
        }

        // 2. Filter by Materia
        if (appliedFilters.materia !== 'all') {
            mods = mods.filter(m => {
                const mat = Array.isArray(m.materia) ? m.materia : [m.materia];
                return mat.includes(appliedFilters.materia);
            });
        }

        // 3. Filter by Status
        if (appliedFilters.status !== 'all') {
            mods = mods.filter(m => {
                const p = m.progress || 0;
                if (appliedFilters.status === 'not_started') return p === 0;
                if (appliedFilters.status === 'in_progress') return p > 0 && p < 100;
                if (appliedFilters.status === 'completed') return p === 100;
                return true;
            });
        }

        // 4. Search Text
        if (appliedFilters.searchTerm) {
            return mods.filter(m => m.title.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase()));
        }
        return mods;
    }, [isStudent, isTeacher, flattenedModules, teacherContext?.modules, searchScope, user?.id, appliedFilters]);

    const isLoading = isStudent ? status === 'pending' : (isTeacher ? teacherContext.isLoadingContent : false);

    // Initial Teacher Load
    useEffect(() => {
        if (isTeacher) {
            teacherContext.fetchModulesLibrary();
        }
    }, [isTeacher]);

    const handleToggleDownload = async (module: Module) => {
        const currentStatus = offlineStatus[module.id] || 'not_downloaded';
        if (currentStatus === 'downloaded') {
            if (window.confirm(`Remover download de "${module.title}"?`)) {
                await removeModuleOffline(module.id);
                setOfflineStatus(prev => ({ ...prev, [module.id]: 'not_downloaded' }));
                addToast('Download removido.', 'info');
            }
        } else if (currentStatus === 'not_downloaded') {
            setOfflineStatus(prev => ({ ...prev, [module.id]: 'downloading' }));
            try {
                await saveModuleOffline(module);
                setOfflineStatus(prev => ({ ...prev, [module.id]: 'downloaded' }));
                addToast('Módulo baixado!', 'success');
            } catch (e) {
                setOfflineStatus(prev => ({ ...prev, [module.id]: 'not_downloaded' }));
                addToast('Erro ao baixar.', 'error');
            }
        }
    };

    // --- RENDER ---
    return (
        <div className="space-y-6 animate-fade-in pb-12">
            
            {/* CONTAINER UNIFICADO (GLASS PANEL) */}
            <div className="glass-panel rounded-3xl overflow-hidden">
                
                {/* 1. Header & Toolbar (Anchored) */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex flex-col gap-6">
                        
                        {/* Top Row: Title + Scope Tabs */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20 shadow-inner">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <h1 className="text-xl font-bold text-white tracking-tight">Repositório de Módulos</h1>
                            </div>

                            {/* Scope Tabs */}
                            <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                                <button 
                                    onClick={() => setSearchScope('my_modules')}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border-2 ${
                                        searchScope === 'my_modules' 
                                            ? 'bg-brand/10 text-white shadow-sm border-brand' 
                                            : 'text-slate-400 hover:text-slate-200 border-white/80 hover:border-white'
                                    }`}
                                >
                                    {isTeacher ? 'Meus Módulos' : 'Minhas Turmas'}
                                </button>
                                <button 
                                    onClick={() => setSearchScope('public')}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border-2 ${
                                        searchScope === 'public' 
                                            ? 'bg-brand/10 text-white shadow-sm border-brand' 
                                            : 'text-slate-400 hover:text-slate-200 border-white/80 hover:border-white'
                                    }`}
                                >
                                    Biblioteca Global
                                </button>
                            </div>
                        </div>

                        {/* Middle Row: Search Bar */}
                        <div className="relative w-full group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-3 bg-black/40 border-2 border-white/80 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand transition-all backdrop-blur-sm"
                                placeholder="Filtrar módulos por nome ou descrição..."
                                value={filterInputs.searchTerm}
                                onChange={e => setFilterInputs(prev => ({ ...prev, searchTerm: e.target.value }))}
                            />
                        </div>

                        {/* Bottom Row: Filter Chips */}
                        <div className="flex flex-wrap gap-2 items-center">
                            <FilterChip 
                                label="Série" 
                                value={filterInputs.serie} 
                                isActive={filterInputs.serie !== 'all'} 
                                onClick={() => setActiveFilterModal('serie')} 
                                customColorClass={seriesActiveColor}
                            />
                            <FilterChip 
                                label="Matéria" 
                                value={filterInputs.materia} 
                                isActive={filterInputs.materia !== 'all'} 
                                onClick={() => setActiveFilterModal('materia')} 
                                customColorClass={materiaActiveColor}
                            />
                            <FilterChip 
                                label="Status" 
                                value={filterInputs.status} 
                                isActive={true} // Always colorful to show state
                                onClick={() => setActiveFilterModal('status')} 
                                customColorClass={statusActiveColor}
                            />
                            {(filterInputs.searchTerm || filterInputs.serie !== 'all' || filterInputs.materia !== 'all' || filterInputs.status !== 'all') && (
                                <button 
                                    onClick={() => setFilterInputs({ searchTerm: '', serie: 'all', materia: 'all', status: 'all' as any })}
                                    className="ml-auto text-xs font-bold text-brand hover:text-white transition-colors uppercase tracking-wider"
                                >
                                    Limpar Filtros
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Content Grid Area */}
                <div className="p-6 bg-gradient-to-b from-transparent to-black/40 min-h-[500px]">
                    {isLoading ? (
                         <div className="flex flex-col justify-center items-center py-20 space-y-4">
                            <SpinnerIcon className="h-8 w-8 text-brand" />
                            <p className="text-slate-500 text-sm font-mono animate-pulse">Carregando repositório...</p>
                        </div>
                    ) : displayedModules.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" role="list">
                                {displayedModules.map((module) => (
                                    <ModuleCard 
                                        key={module.id} 
                                        module={module} 
                                        onStartModule={startModule} 
                                        downloadState={offlineStatus[module.id] || 'not_downloaded'}
                                        onToggleDownload={handleToggleDownload}
                                    />
                                ))}
                            </div>
                            
                            {isStudent && hasNextPage && (
                                <div className="flex justify-center mt-12 pb-4">
                                    <button
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full text-xs font-bold border border-white/10 transition-colors uppercase tracking-widest backdrop-blur-md"
                                    >
                                        {isFetchingNextPage ? 'Carregando stream...' : 'Carregar mais'}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-white/5 rounded-2xl bg-black/20">
                            <div className="p-4 bg-white/5 rounded-full mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            <p className="text-slate-400 font-bold text-sm">Nenhum módulo encontrado.</p>
                            <p className="text-slate-600 text-xs mt-1">Verifique os filtros ou tente outra busca.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Modais de Filtro --- */}
            
            <Modal 
                isOpen={activeFilterModal === 'serie'} 
                onClose={() => setActiveFilterModal(null)} 
                title="Filtrar por Série"
            >
                <div className="grid grid-cols-1 gap-2 p-2">
                    <button onClick={() => { setFilterInputs(p => ({...p, serie: 'all'})); setActiveFilterModal(null); }} className="p-3 text-left hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 text-slate-300 font-mono text-sm">Todas as Séries</button>
                    {SCHOOL_YEARS.map(year => (
                        <button 
                            key={year}
                            onClick={() => { setFilterInputs(p => ({...p, serie: year})); setActiveFilterModal(null); }}
                            className={`p-3 text-left rounded-lg border font-mono text-sm transition-colors ${filterInputs.serie === year ? 'bg-brand/20 border-brand text-white' : 'hover:bg-white/5 border-transparent hover:border-white/10 text-slate-300'}`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </Modal>

            <Modal 
                isOpen={activeFilterModal === 'materia'} 
                onClose={() => setActiveFilterModal(null)} 
                title="Filtrar por Matéria"
            >
                <div className="grid grid-cols-2 gap-2 p-2 max-h-[60vh] overflow-y-auto">
                    <button onClick={() => { setFilterInputs(p => ({...p, materia: 'all'})); setActiveFilterModal(null); }} className="col-span-2 p-3 text-left hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 text-slate-300 font-mono text-sm">Todas as Matérias</button>
                    {SUBJECTS_LIST.map(subj => (
                        <button 
                            key={subj}
                            onClick={() => { setFilterInputs(p => ({...p, materia: subj})); setActiveFilterModal(null); }}
                            className={`p-3 text-left rounded-lg border font-mono text-sm transition-colors ${filterInputs.materia === subj ? 'bg-brand/20 border-brand text-white' : 'hover:bg-white/5 border-transparent hover:border-white/10 text-slate-300'}`}
                        >
                            {subj}
                        </button>
                    ))}
                </div>
            </Modal>

            <Modal 
                isOpen={activeFilterModal === 'status'} 
                onClose={() => setActiveFilterModal(null)} 
                title="Filtrar por Status"
            >
                <div className="grid grid-cols-1 gap-2 p-2">
                    <button onClick={() => { setFilterInputs(p => ({...p, status: 'all'})); setActiveFilterModal(null); }} className="p-3 text-left hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 text-slate-300 font-mono text-sm">Todos</button>
                    <button onClick={() => { setFilterInputs(p => ({...p, status: 'not_started'})); setActiveFilterModal(null); }} className={`p-3 text-left rounded-lg border font-mono text-sm transition-colors ${filterInputs.status === 'not_started' ? 'bg-brand/20 border-brand text-white' : 'hover:bg-white/5 border-transparent hover:border-white/10 text-slate-300'}`}>Não Iniciado</button>
                    <button onClick={() => { setFilterInputs(p => ({...p, status: 'in_progress'})); setActiveFilterModal(null); }} className={`p-3 text-left rounded-lg border font-mono text-sm transition-colors ${filterInputs.status === 'in_progress' ? 'bg-brand/20 border-brand text-white' : 'hover:bg-white/5 border-transparent hover:border-white/10 text-slate-300'}`}>Em Andamento</button>
                    <button onClick={() => { setFilterInputs(p => ({...p, status: 'completed'})); setActiveFilterModal(null); }} className={`p-3 text-left rounded-lg border font-mono text-sm transition-colors ${filterInputs.status === 'completed' ? 'bg-brand/20 border-brand text-white' : 'hover:bg-white/5 border-transparent hover:border-white/10 text-slate-300'}`}>Concluído</button>
                </div>
            </Modal>

        </div>
    );
};

export default Modules;