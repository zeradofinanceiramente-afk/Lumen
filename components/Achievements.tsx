
import React, { useMemo, useEffect } from 'react';
import type { Achievement } from '../types';
import { useStudentGamificationContext } from '../contexts/StudentGamificationContext';
import { Card } from './common/Card';

// --- Visual Helpers ---

const getRarityStyles = (rarity: string = 'common') => {
    switch (rarity) {
        case 'epic':
            return {
                bg: 'bg-purple-900/10',
                text: 'text-purple-400',
                badge: 'bg-purple-500 text-black'
            };
        case 'rare':
            return {
                bg: 'bg-blue-900/10',
                text: 'text-blue-400',
                badge: 'bg-blue-500 text-black'
            };
        case 'common':
        default:
            return {
                bg: 'bg-[#0d1117]',
                text: 'text-slate-400',
                badge: 'bg-slate-600 text-white'
            };
    }
};

const CircularProgress: React.FC<{ percentage: number, level: number }> = ({ percentage, level }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-24 h-24">
            {/* Background Circle */}
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    className="text-slate-800"
                    strokeWidth="6"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="48"
                    cy="48"
                />
                {/* Progress Circle */}
                <circle
                    className="text-brand transition-all duration-1000 ease-out"
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="48"
                    cy="48"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nível</span>
                <span className="text-3xl font-black text-white">{level}</span>
            </div>
        </div>
    );
};

const AchievementCard: React.FC<{ achievement: Achievement }> = React.memo(({ achievement }) => {
    const styles = getRarityStyles(achievement.rarity);

    return (
        <div className={`group relative flex flex-col h-full rounded-2xl border border-brand ${styles.bg} overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-[0_0_15px_rgba(var(--brand-rgb),0.15)] hover:shadow-[0_0_25px_rgba(var(--brand-rgb),0.4)]`}>
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
            
            {/* Rarity Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-50" style={{ color: styles.text.replace('text-', '') }} />

            <div className="p-5 flex flex-col h-full relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center shadow-inner">
                        {achievement.imageUrl ? (
                            <img 
                                src={achievement.imageUrl} 
                                alt={achievement.title} 
                                className="w-10 h-10 object-contain drop-shadow-md"
                                loading="lazy"
                            />
                        ) : (
                            <span className="text-3xl filter drop-shadow-lg">🏆</span>
                        )}
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${styles.badge} tracking-widest`}>
                        {achievement.rarity || 'COMMON'}
                    </span>
                </div>

                <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors leading-tight mb-2">
                    {achievement.title}
                </h3>
                
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4 flex-grow">
                    {achievement.description}
                </p>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">{achievement.date}</span>
                    </div>
                    <span className={`text-xs font-bold font-mono ${styles.text}`}>+{achievement.points} XP</span>
                </div>
            </div>
        </div>
    );
});

const LockedAchievementCard: React.FC<{ achievement: Achievement }> = React.memo(({ achievement }) => (
    <div className="group relative flex flex-col h-full rounded-2xl border border-slate-800 bg-[#09090b] overflow-hidden opacity-60 hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)] opacity-20 pointer-events-none"></div>
        
        <div className="p-5 flex flex-col h-full relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center grayscale opacity-50">
                    {achievement.imageUrl ? (
                        <img src={achievement.imageUrl} alt="" className="w-10 h-10 object-contain" />
                    ) : (
                        <span className="text-3xl">🔒</span>
                    )}
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 tracking-widest border border-slate-700">
                    LOCKED
                </span>
            </div>

            <h3 className="text-lg font-bold text-slate-500 group-hover:text-slate-400 transition-colors mb-2">
                {achievement.title}
            </h3>
            
            <p className="text-xs text-slate-600 font-mono mb-4 flex-grow">
                [REQUISITO]: {achievement.criterion}
            </p>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                <span className="text-xs font-bold font-mono text-slate-600 group-hover:text-yellow-600 transition-colors">+{achievement.points} XP</span>
            </div>
        </div>
    </div>
));

const Achievements: React.FC = () => {
    const { achievements, userStats, loadGamificationData } = useStudentGamificationContext();

    useEffect(() => {
        loadGamificationData();
    }, [loadGamificationData]);

    const unlockedAchievements = useMemo(() => achievements.filter(a => a.unlocked), [achievements]);
    const lockedAchievements = useMemo(() => achievements.filter(a => !a.unlocked && a.status === 'Ativa'), [achievements]);

    const unlockedCount = unlockedAchievements.length;
    const totalCount = achievements.length;
    
    // Nível e XP
    const currentLevel = userStats.level;
    const currentXP = userStats.xp;
    const xpForNext = 100; // Simplificado conforme lógica atual do hook (cada 100 xp = 1 nível)
    const levelProgress = (currentXP % 100); 

    return (
        <div className="animate-fade-in pb-20">
            {/* CONTAINER PRINCIPAL DE VIDRO FOSCO */}
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                
                {/* --- HERO HUD --- */}
                <div className="relative rounded-2xl overflow-hidden bg-[#0d1117]/60 border border-white/10 p-6 md:p-8 mb-10 shadow-inner">
                    {/* Background Effects */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -ml-10 -mb-10 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                        {/* Level Circle */}
                        <div className="flex-shrink-0">
                            <CircularProgress percentage={levelProgress} level={currentLevel} />
                        </div>

                        {/* Stats Text */}
                        <div className="flex-grow text-center md:text-left space-y-2">
                            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                                PERFIL DO <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-cyan-400">EXPLORADOR</span>
                            </h2>
                            <div className="flex flex-col md:flex-row items-center gap-4 text-sm font-mono text-slate-400">
                                <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                    XP TOTAL: <span className="text-white font-bold">{currentXP}</span>
                                </span>
                                <span className="hidden md:inline text-slate-600">|</span>
                                <span>Próximo Nível: {100 - levelProgress} XP restantes</span>
                            </div>
                            
                            {/* XP Bar Linear */}
                            <div className="w-full h-2 bg-slate-800 rounded-full mt-4 overflow-hidden border border-slate-700">
                                <div 
                                    className="h-full bg-gradient-to-r from-brand to-cyan-400 shadow-[0_0_15px_rgba(74,222,128,0.5)] transition-all duration-1000 ease-out" 
                                    style={{ width: `${levelProgress}%` }}
                                />
                            </div>
                        </div>

                        {/* Badges Count */}
                        <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm min-w-[120px]">
                            <span className="text-3xl font-black text-white">{unlockedCount}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Medalhas</span>
                        </div>
                    </div>
                </div>

                {/* --- UNLOCKED GRID --- */}
                <div className="mb-12">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="text-brand">●</span> 
                        Conquistas Desbloqueadas 
                        <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded ml-2">{unlockedCount}</span>
                    </h3>
                    
                    {unlockedAchievements.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                            {unlockedAchievements.map(ach => (
                                <AchievementItem key={ach.id} achievement={ach} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                            <div className="text-4xl grayscale opacity-30 mb-4">🏆</div>
                            <p className="text-slate-500 font-mono text-sm">Nenhuma conquista registrada ainda.</p>
                            <p className="text-slate-600 text-xs mt-1">Complete atividades para ganhar badges.</p>
                        </div>
                    )}
                </div>

                {/* --- LOCKED GRID --- */}
                {lockedAchievements.length > 0 && (
                    <div>
                        <h3 className="text-xl font-bold text-slate-500 mb-6 flex items-center gap-3 uppercase tracking-wider text-sm border-t border-white/5 pt-8">
                            <span className="text-slate-700">🔒</span> 
                            Disponíveis para Desbloqueio
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                            {lockedAchievements.map(ach => (
                                <LockedAchievementCard key={ach.id} achievement={ach} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Wrapper para evitar rerenders desnecessários no grid principal
const AchievementItem: React.FC<{ achievement: Achievement }> = ({ achievement }) => (
    <AchievementCard achievement={achievement} />
);

export default Achievements;
