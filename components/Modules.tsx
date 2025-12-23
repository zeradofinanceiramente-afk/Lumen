
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

    return (
        <div 
            onClick={() => onStartModule(module)}
            className="relative h-64 rounded-3xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-300 border border-white/10 hover:border-brand/50"
            role="article"
            aria-label={`Módulo ${module.title}`}
            tabIndex={0}
        >
            {/* Background Image */}
            <div className="absolute inset-0 bg-slate-900">
                {module.coverImageUrl ? (
                    <img 
                        src={module.coverImageUrl} 
                        alt="" 
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" 
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-black" />
                )}
            </div>

            {/* Gradient Overlay for Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90" />

            {/* Top Controls */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleDownload(module);
                    }}
                    disabled={downloadState === 'downloading'}
                    className={`p-2 rounded-full backdrop-blur-md transition-all border ${
                        downloadState === 'downloaded' 
                            ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50' 
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                    }`}
                    title={downloadState === 'downloaded' ? "Remover download" : "Baixar para offline"}
                >
                    {downloadState === 'downloading' ? (
                        <SpinnerIcon className="h-4 w-4" />
                    ) : downloadState === 'downloaded' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    )}
                </button>
            </div>

            {/* Content Area */}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end h-full z-10">
                <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
                    <div className="flex gap-2 mb-2">
                        {module.difficulty && (
                            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                                {module.difficulty}
                            </span>
                        )}
                        {module.materia && (
                            <span className="text-[10px] font-bold tracking-wider uppercase text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                                {Array.isArray(module.materia) ? module.materia[0] : module.materia}
                            </span>
                        )}
                    </div>
                    
                    <h3 className="text-xl md:text-2xl font-bold text-white leading-tight mb-2 group-hover:text-brand transition-colors">
                        {module.title}
                    </h3>
                    
                    <p className="text-sm text-slate-400 line-clamp-2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 h-0 group-hover:h-auto">
                        {module.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/20 rounded-full h-1 mt-1">
                        <div 
                            className={`h-1 rounded-full shadow-[0_0_10px_currentColor] transition-all duration-500 ${isCompleted ? 'bg-green-400 text-green-400' : 'bg-brand text-brand'}`} 
                            style={{ width: `${progress}%` }} 
                        />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-slate-400 font-mono">
                            {isCompleted ? 'Concluído' : `${progress}% Completo`}
                        </span>
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
        
        const finalModules = results.map((m, i) => ({ ...m, progress: progressValues[i] }));

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
        let mods = isStudent ? flattenedModules : [];
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
        <div className="space-y-8 animate-fade-in">
            {/* Header / Search Area */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-4 p-1 bg-white/5 rounded-2xl border border-white/10">
                    <button 
                        onClick={() => setSearchScope('my_modules')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${searchScope === 'my_modules' ? 'bg-brand text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Meus Módulos
                    </button>
                    <button 
                        onClick={() => setSearchScope('public')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${searchScope === 'public' ? 'bg-brand text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Biblioteca Pública
                    </button>
                </div>

                <div className="relative w-full md:w-80">
                    <input
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all backdrop-blur-md"
                        placeholder="Buscar módulo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Content Grid */}
            <div className="min-h-[50vh]">
                {isLoading ? (
                     <div className="flex justify-center py-20">
                        <SpinnerIcon className="h-10 w-10 text-brand" />
                    </div>
                ) : displayedModules.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
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
                                    className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-all border border-white/10 backdrop-blur-md"
                                >
                                    {isFetchingNextPage ? 'Carregando...' : 'Carregar Mais'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
                        <p className="text-slate-400 text-lg">Nenhum módulo encontrado.</p>
                        <p className="text-slate-500 text-sm mt-2">Tente mudar o filtro ou buscar outro termo.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modules;
