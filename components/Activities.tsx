
import React, { useState, useRef, useEffect, useContext, useMemo, useCallback } from 'react';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import type { Activity, ActivitySubmission } from '../types';
import { SpinnerIcon } from '../constants/index';
import { cleanActivity } from '../utils/cleanActivity';
import { query, collection, where, orderBy, limit, startAfter, getDocs, doc, getDoc, documentId } from 'firebase/firestore';
import { db } from './firebaseClient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getSubjectTheme } from '../utils/subjectTheme';

const isRecent = (dateInput?: string | any) => {
    if (!dateInput) return false;
    let date: Date;
    if (dateInput?.toDate) {
        date = dateInput.toDate();
    } else {
        date = new Date(dateInput);
    }
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 3;
};

// --- GAMER UI COMPONENTS ---

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    let colorClass = 'bg-slate-800 text-slate-400 border-slate-700'; // Default / Locked
    let label = 'LOCKED';
    let icon = '🔒';

    if (status === 'Corrigido') {
        colorClass = 'bg-green-500/10 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(74,222,128,0.2)]';
        label = 'COMPLETED';
        icon = '✨';
    } else if (status === 'Aguardando correção' || status === 'Entregue') {
        colorClass = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50';
        label = 'IN REVIEW';
        icon = '⏳';
    } else if (status === 'Pendente Envio' || !status) {
        colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/50 animate-pulse-slow';
        label = 'ACTIVE QUEST';
        icon = '⚔️';
    }

    return (
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${colorClass}`}>
            <span>{icon}</span>
            {label}
        </span>
    );
};

// Memoized Card for Performance
const ActivityCard: React.FC<{ activity: Activity; submission?: ActivitySubmission; onClick: () => void }> = React.memo(({ activity, submission, onClick }) => {
    const statusText = submission?.status || null;
    const isNew = !submission && isRecent(activity.createdAt);
    
    const typeLabel = activity.items ? `${activity.items.length} TASKS` : 'FILE UPLOAD';
    
    // Theme base on subject
    const theme = getSubjectTheme(activity.materia);

    return (
        <div 
            onClick={onClick}
            className={`
                group relative flex flex-col h-full 
                bg-[#0d1117] border border-white/5 
                border-l-4 ${theme.border}
                rounded-r-xl overflow-hidden 
                transition-all duration-300 cursor-pointer hover:-translate-y-1
                hover:shadow-[0_0_30px_-5px_rgba(0,0,0,0.3)]
                will-change-transform
            `}
        >
            {/* Background Texture - Optimized for reduced motion */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none" />
            
            {/* Gradient Flush on Hover based on Subject */}
            <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none`} />

            {/* New Badge Corner */}
            {isNew && (
                <div className="absolute top-0 right-0">
                    <div className="bg-brand text-[#09090b] text-[9px] font-black px-2 py-1 rounded-bl-lg uppercase tracking-widest shadow-lg">
                        NEW DROP
                    </div>
                </div>
            )}

            <div className="p-5 flex flex-col h-full relative z-10">
                {/* Header: Meta Tags */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${theme.bg} ${theme.text} ${theme.border}`}>
                            {activity.materia?.substring(0, 3).toUpperCase() || 'GEN'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-slate-500 border border-white/10 uppercase">
                            {typeLabel}
                        </span>
                    </div>
                </div>

                {/* Body: Title & Desc */}
                <div className="flex-grow">
                    <h3 className={`text-lg font-bold text-slate-200 group-hover:${theme.text} transition-colors leading-tight mb-2 line-clamp-2`}>
                        {activity.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {activity.description}
                    </p>
                </div>

                {/* Footer: Stats Grid */}
                <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-2 gap-4 items-end">
                    
                    {/* Left: Status */}
                    <div>
                        <StatusBadge status={statusText || ''} />
                    </div>

                    {/* Right: XP / Date */}
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-brand font-mono font-bold text-sm">
                            <span>+{activity.points}</span>
                            <span className="text-[10px] opacity-70">XP</span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                            {activity.dueDate ? `DUE: ${new Date(activity.dueDate).toLocaleDateString('pt-BR')}` : 'NO DEADLINE'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const HeroStats: React.FC<{ totalAvailable: number; totalXp: number }> = React.memo(({ totalAvailable, totalXp }) => (
    <div className="relative overflow-hidden rounded-2xl bg-[#0d1117] border border-white/10 p-6 md:p-8 mb-8 group shadow-2xl">
        {/* Dynamic Glow Background based on User Brand Color */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand/20 via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
        
        {/* Subtle Noise Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay"></div>
        
        {/* Content Layer */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3 flex flex-wrap gap-2 items-baseline">
                    <span className="text-slate-400 font-bold tracking-tighter">QUADRO DE</span>
                    <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">MISSÕES</span>
                </h1>
                <p className="text-slate-300 text-sm max-w-lg leading-relaxed font-medium">
                    Complete atividades para ganhar XP, desbloquear conquistas e subir de nível. 
                    Mantenha seu streak de aprendizado ativo.
                </p>
            </div>
            
            <div className="flex gap-4">
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 min-w-[110px] shadow-lg group-hover:border-white/20 transition-colors">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Disponíveis</p>
                    <p className="text-3xl font-bold text-white font-mono tracking-tight">{totalAvailable}</p>
                </div>
                
                <div className="bg-brand/10 backdrop-blur-md border border-brand/40 rounded-xl p-4 min-w-[110px] shadow-[0_0_20px_rgba(var(--brand-rgb),0.15)] group-hover:shadow-[0_0_30px_rgba(var(--brand-rgb),0.25)] transition-all">
                    <p className="text-[10px] font-mono text-brand uppercase tracking-widest mb-1.5 font-bold">XP Total</p>
                    <p className="text-3xl font-bold text-white font-mono tracking-tight">{totalXp}</p>
                </div>
            </div>
        </div>
    </div>
));

const Activities: React.FC = () => {
    const { studentClasses, userSubmissions, isLoading: isContextLoading } = useStudentAcademic();
    const { openActivity } = useNavigation(); 
    const { user } = useAuth();
    
    const [selectedClassId, setSelectedClassId] = useState('all');
    const [selectedUnidade, setSelectedUnidade] = useState('all');
    const [selectedMateria, setSelectedMateria] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('a_fazer'); 

    const safeSubmissions = userSubmissions || {};
    const safeStudentClasses = studentClasses || [];
    
    const unidadeOptions = ['1ª Unidade', '2ª Unidade', '3ª Unidade', '4ª Unidade'];
    const materiaOptions = ['História', 'Geografia', 'Filosofia', 'Sociologia', 'História Sergipana', 'Artes', 'Inglês', 'Espanhol', 'Matemática', 'Física', 'Química', 'Biologia', 'Ciências', 'Português / Literatura'];

    // Helper: Fetch by ID batch
    const fetchActivitiesByIds = async (ids: string[]) => {
        if (ids.length === 0) return [];
        const chunks = [];
        for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));
        
        const promises = chunks.map(chunk => {
            const q = query(collection(db, "activities"), where(documentId(), "in", chunk));
            return getDocs(q);
        });
        
        const snapshots = await Promise.all(promises);
        return snapshots.flatMap(snap => snap.docs);
    };

    const submissionsSignature = useMemo(() => {
        return Object.keys(safeSubmissions).sort().map(key => `${key}:${safeSubmissions[key].status}`).join('|');
    }, [safeSubmissions]);

    // --- Infinite Query Logic ---
    const fetchActivitiesPage = async ({ pageParam }: { pageParam: string | null }) => {
        if (!user) return { activities: [], lastId: null };

        if (selectedStatus === 'pendente' || selectedStatus === 'corrigida') {
            if (pageParam) return { activities: [], lastId: null };

            const targetStatus = selectedStatus === 'pendente' ? 'Aguardando correção' : 'Corrigido';
            const relevantIds = Object.keys(safeSubmissions).filter(id => {
                const sub = safeSubmissions[id];
                return sub && sub.status === targetStatus;
            });

            if (relevantIds.length === 0) return { activities: [], lastId: null };

            const docs = await fetchActivitiesByIds(relevantIds);
            const results = docs.map(d => {
                const data = d.data();
                let className = data.className;
                if (!className || className === 'Turma desconhecida') {
                    const cls = safeStudentClasses.find(c => c.id === data.classId);
                    if (cls) className = cls.name;
                }
                return {
                    id: d.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
                    dueDate: data.dueDate,
                    className: className || 'Turma'
                } as Activity;
            });

            results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return { activities: results, lastId: null };
        }

        let q = query(
            collection(db, "activities"),
            where("isVisible", "==", true),
            orderBy("createdAt", "desc"),
            limit(12) 
        );

        if (selectedClassId !== 'all') {
            q = query(q, where("classId", "==", selectedClassId));
        } else {
            const myClassIds = safeStudentClasses.map(c => c.id);
            if (myClassIds.length > 0) {
                const classChunk = myClassIds.slice(0, 10);
                q = query(q, where("classId", "in", classChunk));
            } else {
                return { activities: [], lastId: null }; 
            }
        }

        if (selectedMateria !== 'all') q = query(q, where("materia", "==", selectedMateria));
        if (selectedUnidade !== 'all') q = query(q, where("unidade", "==", selectedUnidade));

        if (pageParam) {
            try {
                const cursorRef = doc(db, "activities", pageParam);
                const cursorSnap = await getDoc(cursorRef);
                if (cursorSnap.exists()) q = query(q, startAfter(cursorSnap));
            } catch (e) {
                console.warn("Could not rehydrate activity cursor", e);
            }
        }

        const snap = await getDocs(q);
        const results = snap.docs.map(d => {
            const data = d.data();
            let className = data.className;
            if (!className || className === 'Turma desconhecida') {
                const cls = safeStudentClasses.find(c => c.id === data.classId);
                if (cls) className = cls.name;
            }
            return {
                id: d.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
                dueDate: data.dueDate,
                className: className || 'Turma'
            } as Activity;
        });

        return { 
            activities: results, 
            lastId: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null 
        };
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        status,
        refetch
    } = useInfiniteQuery({
        queryKey: ['activities', user?.id, selectedClassId, selectedMateria, selectedUnidade, selectedStatus, submissionsSignature],
        queryFn: fetchActivitiesPage,
        getNextPageParam: (lastPage) => lastPage.lastId || undefined,
        initialPageParam: null,
        enabled: !!user && safeStudentClasses.length > 0
    });

    const displayedActivities = useMemo(() => {
        const allActivities = data?.pages.flatMap(page => page.activities) || [];
        
        if (selectedStatus === 'pendente' || selectedStatus === 'corrigida') {
            return allActivities.filter(activity => {
                if (selectedClassId !== 'all' && activity.classId !== selectedClassId) return false;
                if (selectedMateria !== 'all' && activity.materia !== selectedMateria) return false;
                if (selectedUnidade !== 'all' && activity.unidade !== selectedUnidade) return false;
                return true;
            });
        }

        if (selectedStatus === 'a_fazer') {
            return allActivities.filter(activity => {
                const studentSubmission = safeSubmissions[activity.id];
                return !studentSubmission || studentSubmission.status === 'Pendente Envio';
            });
        }

        return allActivities;
    }, [data, safeSubmissions, selectedStatus, selectedClassId, selectedMateria, selectedUnidade]);

    const handleSearch = () => { refetch(); };

    // UseCallback for click handler to ensure stability for React.memo
    const handleActivityClick = useCallback((activity: Activity) => {
        const activityWithSub = { 
            ...cleanActivity(activity), 
            submissions: safeSubmissions[activity.id] ? [safeSubmissions[activity.id]] : [] 
        };
        openActivity(activityWithSub);
    }, [safeSubmissions, openActivity]);
    
    const selectClass = "bg-[#0d1117] text-slate-300 text-xs font-mono font-bold border border-white/10 rounded-lg px-3 py-2.5 focus:border-brand focus:ring-1 focus:ring-brand outline-none uppercase tracking-wide appearance-none cursor-pointer hover:bg-white/5 transition-colors";

    const isLoadingCombined = isContextLoading || status === 'pending';

    const totalXpPotential = useMemo(() => displayedActivities.reduce((acc, a) => acc + (a.points || 0), 0), [displayedActivities]);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Hero Section */}
            <HeroStats totalAvailable={displayedActivities.length} totalXp={totalXpPotential} />

            {/* Filter Command Bar */}
            <div className="sticky top-4 z-20 bg-[#161b22]/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl flex flex-col md:flex-row gap-3 items-center">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                    <div className="relative group">
                        <label className="absolute -top-2 left-2 px-1 bg-[#161b22] text-[9px] font-bold text-slate-500 uppercase">Status</label>
                        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="a_fazer">Active Quests (A Fazer)</option>
                            <option value="pendente">In Review (Pendentes)</option>
                            <option value="corrigida">Completed (Corrigidas)</option>
                            <option value="all">All Logs</option>
                        </select>
                    </div>

                    <div className="relative group">
                        <label className="absolute -top-2 left-2 px-1 bg-[#161b22] text-[9px] font-bold text-slate-500 uppercase">Turma</label>
                        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="all">All Classes</option>
                            {safeStudentClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="relative group">
                        <label className="absolute -top-2 left-2 px-1 bg-[#161b22] text-[9px] font-bold text-slate-500 uppercase">Matéria</label>
                        <select value={selectedMateria} onChange={e => setSelectedMateria(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="all">All Subjects</option>
                            {materiaOptions.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="relative group">
                        <label className="absolute -top-2 left-2 px-1 bg-[#161b22] text-[9px] font-bold text-slate-500 uppercase">Unidade</label>
                        <select value={selectedUnidade} onChange={e => setSelectedUnidade(e.target.value)} className={`${selectClass} w-full`}>
                            <option value="all">All Units</option>
                            {unidadeOptions.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleSearch}
                    disabled={isFetching}
                    className="w-full md:w-auto px-6 py-2.5 bg-brand text-black font-black text-xs uppercase tracking-widest rounded-lg hover:bg-brand/90 hover:shadow-[0_0_15px_rgba(var(--brand-rgb),0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                >
                    {isFetching && !isLoadingCombined ? <SpinnerIcon className="h-4 w-4 text-black mr-2" /> : <span className="mr-2">⚡</span>}
                    Refresh Data
                </button>
            </div>

            {/* Content Grid */}
            {isLoadingCombined ? (
                 <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-brand rounded-full blur-xl opacity-20 animate-pulse"></div>
                        <SpinnerIcon className="h-12 w-12 text-brand relative z-10" />
                    </div>
                    <p className="text-slate-500 font-mono text-sm tracking-widest animate-pulse">
                        SYNCING NEURAL LINK...
                    </p>
                </div>
            ) : displayedActivities.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {displayedActivities.map(activity => (
                            <ActivityCard 
                                key={activity.id} 
                                activity={activity} 
                                submission={safeSubmissions[activity.id]}
                                onClick={() => handleActivityClick(activity)} 
                            />
                        ))}
                    </div>
                    
                    {hasNextPage && selectedStatus === 'all' && (
                        <div className="flex justify-center pt-8">
                            <button
                                onClick={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className="px-8 py-3 bg-[#0d1117] text-slate-400 border border-slate-700 font-mono text-xs font-bold rounded-full hover:text-white hover:border-brand hover:shadow-[0_0_15px_rgba(var(--brand-rgb),0.2)] transition-all flex items-center gap-2 uppercase tracking-widest"
                            >
                                {isFetchingNextPage ? <SpinnerIcon className="h-4 w-4" /> : '▼'}
                                Load More Logs
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-4xl grayscale opacity-50">
                        🛡️
                    </div>
                    <h2 className="text-xl font-bold text-slate-200 font-mono">NO QUESTS FOUND</h2>
                    <p className="text-slate-500 text-sm mt-2 font-mono">
                        {selectedStatus === 'a_fazer' ? 'All systems operational. No active tasks.' : 'Adjust filters to locate logs.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default Activities;
