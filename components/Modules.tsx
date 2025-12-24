
import React, { useState, useMemo, useEffect, useContext } from 'react';
import type { Module, ModuleDownloadState } from '../types';
import { Card } from './common/Card';
import { SpinnerIcon } from '../constants/index';
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

    // Cores de dificuldade estilo "Rank"
    const difficultyColor = module.difficulty === 'Difícil' ? 'text-red-400 border-red-400/30 bg-red-400/10' :
                            module.difficulty === 'Médio' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
                            'text-green-400 border-green-400/30 bg-green-400/10';

    return (
        <div 
            onClick={() => onStartModule(module)}
            className="group relative flex flex-col bg-[#0d1117] border border-slate-800 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-brand/50 hover:shadow-[0_0_20px_rgba(var(--brand-rgb),0.15)] hover:-translate-y-1"
            role="article"
            aria-label={`Módulo ${module.title}`}
            tabIndex={0}
        >
            {/* Header Image Area */}
            <div className="relative h-32 w-full bg-slate-900 overflow-hidden border-b border-slate-800">
                {module.coverImageUrl ? (
                    <img 
                        src={module.coverImageUrl} 
                        alt="" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                )}
                
                {/* Download Button (Top Right) */}
                <div className="absolute top-2 right-2 z-20">
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleDownload(module);
                        }}
                        disabled={downloadState === 'downloading'}
                        className={`p-1.5 rounded-md backdrop-blur-md transition-all border text-xs font-mono flex items-center gap-1 ${
                            downloadState === 'downloaded' 
                                ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50' 
                                : 'bg-black/50 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                        title={downloadState === 'downloaded' ? "Remover offline" : "Baixar para offline"}
                    >
                        {downloadState === 'downloading' ? (
                            <SpinnerIcon className="h-3 w-3" />
                        ) : downloadState === 'downloaded' ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span>OFFLINE</span>
                            </>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        )}
                    </button>
                </div>

                {/* Materia Tag (Bottom Left of Image) */}
                <div className="absolute bottom-2 left-2">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-brand bg-black/80 backdrop-blur border border-brand/30 px-2 py-0.5 rounded">
                        {Array.isArray(module.materia) ? module.materia[0] : module.materia}
                    </span>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-4 flex flex-col flex-grow relative">
                
                {/* Title & Description */}
                <div className="mb-4">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="text-base font-bold text-slate-200 group-hover:text-brand transition-colors line-clamp-1 leading-tight">
                            {module.title}
                        </h3>
                        {module.difficulty && (
                            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${difficultyColor} flex-shrink-0`}>
                                {module.difficulty}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 font-medium">
                        {module.description}
                    </p>
                </div>

                <div className="mt-auto space-y-3">
                    {/* Meta Info Row */}
                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-600">
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                            <span>{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            <span>{module.pages?.length || '?'} pgs</span>
                        </div>
                    </div>

                    {/* Progress Bar (XP Style) */}
                    <div className="relative">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                            <span>PROGRESSO</span>
                            <span className={isCompleted ? 'text-green-400' : 'text-brand'}>{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
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

    // --- UI STATE ---
    const [searchTerm, setSearchTerm] = useState('');
    const [searchScope, setSearchScope] = useState<'my_modules' | 'public'>('my_modules');
    
    const [offlineStatus, setOfflineStatus] = useState<Record<string, ModuleDownloadState>>({});
    
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

        q = query(q, limit(10));

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
        
        // Explicit cast to Module[] to ensure type consistency
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
        isFetching,
        isFetchingNextPage,
        status
    } = useInfiniteQuery({
        queryKey: ['modules', user?.id, searchScope],
        queryFn: fetchModulesPage,
        getNextPageParam: (lastPage) => lastPage.lastId || undefined,
        initialPageParam: null,
        enabled: isStudent && !!user && !!studentContext
    });

    const flattenedModules = useMemo(() => {
        return data?.pages.flatMap(page => page.modules) || [];
    }, [data]);

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
        
        if (searchTerm) {
            return mods.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return mods;
    }, [isStudent, isTeacher, flattenedModules, teacherContext?.modules, searchTerm, searchScope, user?.id]);

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

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header Controls (Repo Navigation Style) */}
            <div className="border-b border-slate-800 pb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    
                    {/* Filter Tabs */}
                    <div className="flex p-1 bg-[#0d1117] rounded-lg border border-slate-800">
                        <button 
                            onClick={() => setSearchScope('my_modules')}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                                searchScope === 'my_modules' 
                                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            {isTeacher ? 'Meus Módulos' : 'Minhas Turmas'}
                        </button>
                        <button 
                            onClick={() => setSearchScope('public')}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                                searchScope === 'public' 
                                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            Biblioteca Global
                        </button>
                    </div>

                    {/* Search Bar (Code Search Style) */}
                    <div className="relative w-full md:w-96 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-brand transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all font-mono"
                            placeholder="Buscar módulos..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-[10px] text-slate-600 border border-slate-800 rounded px-1.5 py-0.5">/</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="min-h-[50vh]">
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
                            <div className="flex justify-center mt-12">
                                <button
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-sm font-mono border border-slate-700 transition-colors"
                                >
                                    {isFetchingNextPage ? 'Carregando...' : 'Carregar mais...'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-slate-800 rounded-xl bg-[#0d1117]">
                        <div className="p-4 bg-slate-800/50 rounded-full mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <p className="text-slate-400 font-mono text-sm">Nenhum módulo encontrado.</p>
                        <p className="text-slate-600 text-xs mt-1">Verifique os filtros ou tente outra busca.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modules;
