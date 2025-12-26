
import React, { useState, useMemo, useEffect } from 'react';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { useStudentGamificationContext } from '../contexts/StudentGamificationContext';
import type { Quiz } from '../types';
import { QuizView } from './QuizView';
import { useAuth } from '../contexts/AuthContext';
import { SpinnerIcon, SUBJECTS_LIST, SCHOOL_YEARS } from '../constants/index';
import { Modal } from './common/Modal';
import { getSubjectTheme } from '../utils/subjectTheme';
import { useNavigation } from '../contexts/NavigationContext';

// Helper para cores de Série (Consistente com Modules.tsx)
const getSeriesColor = (series: string) => {
    if (series === 'all') return undefined;
    
    if (series.includes('6º')) return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
    if (series.includes('7º')) return 'text-teal-400 border-teal-400/30 bg-teal-400/10';
    if (series.includes('8º')) return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
    if (series.includes('9º')) return 'text-lime-400 border-lime-400/30 bg-lime-400/10';
    if (series.includes('1º')) return 'text-indigo-400 border-indigo-400/30 bg-indigo-400/10';
    if (series.includes('2º')) return 'text-violet-400 border-violet-400/30 bg-violet-400/10';
    if (series.includes('3º')) return 'text-fuchsia-400 border-fuchsia-400/30 bg-fuchsia-400/10';
    
    return 'text-slate-400 border-slate-400/30 bg-slate-400/10';
};

// Helper para cores de Status (Solicitação Jarvis)
const getStatusColor = (status: string) => {
    switch (status) {
        case 'feito': // Concluídos -> Verde (Emerald)
            return 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]';
        case 'nao_iniciado': // Pendentes -> Amarelo (Amber)
            return 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]';
        case 'all': // Todos -> Azul
        default:
            return 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.3)]';
    }
};

const FilterChip: React.FC<{ 
    label: string; 
    value: string; 
    isActive: boolean; 
    onClick: () => void;
    customColorClass?: string;
}> = ({ label, value, isActive, onClick, customColorClass }) => {
    
    // Hacker Green style fallback
    const activeStyle = customColorClass || 'bg-green-500/10 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]';

    return (
        <button 
            onClick={onClick}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                isActive 
                    ? activeStyle 
                    : 'bg-black/40 border-white/5 text-slate-400 hover:bg-white/5 hover:text-white hover:border-white/20'
            }`}
        >
            <span className="opacity-60 font-normal">{label}:</span>
            <span className="truncate max-w-[120px]">{value === 'all' ? 'Todos' : value === 'nao_iniciado' ? 'Pendentes' : value === 'feito' ? 'Concluídos' : value}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </button>
    );
};

const QuizCard: React.FC<{ quiz: Quiz, onStart: () => void }> = ({ quiz, onStart }) => {
    const attempts = quiz.attempts || 0;
    const isCompleted = attempts > 0;
    
    const displayMateria = Array.isArray(quiz.materia) ? quiz.materia[0] : quiz.materia || 'Geral';
    const displaySeries = Array.isArray(quiz.series) ? quiz.series[0] : quiz.series || 'Geral';
    
    // Uso do tema global
    const theme = getSubjectTheme(displayMateria);

    return (
        <div 
            onClick={onStart}
            className={`
                group relative flex flex-col 
                bg-black/20 backdrop-blur-md
                border-2 ${theme.border} 
                rounded-2xl overflow-hidden cursor-pointer 
                transition-all duration-300 
                hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]
            `}
        >
            {/* Top Gradient Splash */}
            <div className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-b ${theme.gradient} to-transparent opacity-50`} />

            <div className="p-5 flex flex-col h-full relative z-10">
                {/* Header: Badges */}
                <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${theme.bg} ${theme.text} ${theme.border}`}>
                        {displayMateria}
                    </span>
                    {isCompleted && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-900/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            FEITO ({attempts}x)
                        </span>
                    )}
                </div>

                {/* Body: Title & Desc */}
                <div className="flex-grow">
                    <h3 className={`text-sm font-bold text-slate-100 group-hover:${theme.text} transition-colors leading-tight mb-2`}>
                        {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                        {quiz.description}
                    </p>
                </div>

                {/* Footer: Meta Info */}
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500 font-mono">
                    <span className="opacity-70">{displaySeries}</span>
                    <span className={`flex items-center gap-1 group-hover:text-white transition-colors ${theme.text}`}>
                        {quiz.questions.length} Questões
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </span>
                </div>
            </div>
        </div>
    );
};

const Quizzes: React.FC = () => {
    const { user } = useAuth();
    const { searchedQuizzes, searchQuizzes, isSearchingQuizzes } = useStudentAcademic();
    const { handleQuizCompleteLogic } = useStudentGamificationContext();
    const { activeQuiz, startQuiz, exitQuiz } = useNavigation(); // Use global Navigation Context
    
    // --- FILTERS STATE ---
    const [selectedSerie, setSelectedSerie] = useState(user?.series || 'all');
    const [selectedMateria, setSelectedMateria] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'feito' | 'nao_iniciado'>('all');
    
    // --- MODAL STATE ---
    const [activeFilterModal, setActiveFilterModal] = useState<'serie' | 'materia' | 'status' | null>(null);

    // Trigger search on filter change
    useEffect(() => {
        searchQuizzes({
            serie: selectedSerie,
            materia: selectedMateria,
            status: selectedStatus
        });
    }, [selectedSerie, selectedMateria, selectedStatus]); // Auto-search on change

    // --- Dynamic Color Calculations ---
    const seriesActiveColor = selectedSerie !== 'all' ? getSeriesColor(selectedSerie) : undefined;
    const materiaTheme = getSubjectTheme(selectedMateria);
    const materiaActiveColor = selectedMateria !== 'all' ? `${materiaTheme.text} ${materiaTheme.border} ${materiaTheme.bg}` : undefined;
    
    // Status color calculation (Always active logic per user request)
    const statusActiveColor = getStatusColor(selectedStatus);

    if (activeQuiz) {
        return (
            <div className="max-w-4xl mx-auto animate-fade-in">
                <button 
                    onClick={exitQuiz} 
                    className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" /></svg>
                    Voltar para Lista
                </button>
                <div className="glass-panel rounded-3xl p-6 shadow-2xl">
                    <QuizView quiz={activeQuiz} onQuizComplete={handleQuizCompleteLogic} />
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6 animate-fade-in pb-12">
            
            {/* CONTAINER UNIFICADO (GLASS PANEL) */}
            <div className="glass-panel rounded-3xl overflow-hidden">
                
                {/* 1. Header & Toolbar */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex flex-col gap-6">
                        
                        {/* Title Row */}
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-xl text-green-400 border border-green-500/20 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight">Banco de Quizzes</h1>
                                <p className="text-xs text-slate-500 font-mono">Pratique seus conhecimentos com avaliações rápidas.</p>
                            </div>
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-wrap gap-2 items-center">
                            <FilterChip 
                                label="Série" 
                                value={selectedSerie} 
                                isActive={selectedSerie !== 'all'} 
                                onClick={() => setActiveFilterModal('serie')}
                                customColorClass={seriesActiveColor}
                            />
                            <FilterChip 
                                label="Matéria" 
                                value={selectedMateria} 
                                isActive={selectedMateria !== 'all'} 
                                onClick={() => setActiveFilterModal('materia')} 
                                customColorClass={materiaActiveColor}
                            />
                            <FilterChip 
                                label="Status" 
                                value={selectedStatus} 
                                isActive={true} // Always active color to show blue/yellow/green state
                                onClick={() => setActiveFilterModal('status')} 
                                customColorClass={statusActiveColor}
                            />
                            
                            {(selectedSerie !== 'all' || selectedMateria !== 'all' || selectedStatus !== 'all') && (
                                <button 
                                    onClick={() => {
                                        setSelectedSerie('all');
                                        setSelectedMateria('all');
                                        setSelectedStatus('all');
                                    }}
                                    className="ml-auto text-xs font-bold text-green-400 hover:text-white transition-colors uppercase tracking-wider"
                                >
                                    Limpar Filtros
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Grid Content */}
                <div className="p-6 bg-gradient-to-b from-transparent to-black/40 min-h-[500px]">
                    {isSearchingQuizzes ? (
                         <div className="flex flex-col justify-center items-center py-20 space-y-4">
                            <SpinnerIcon className="h-8 w-8 text-green-500" />
                            <p className="text-slate-500 text-sm font-mono animate-pulse">Buscando avaliações...</p>
                        </div>
                    ) : searchedQuizzes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {searchedQuizzes.map(quiz => (
                                <QuizCard 
                                    key={quiz.id} 
                                    quiz={quiz} 
                                    onStart={() => startQuiz(quiz)} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-white/5 rounded-2xl bg-black/20">
                            <div className="p-4 bg-white/5 rounded-full mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-slate-400 font-bold text-sm">Nenhum quiz encontrado.</p>
                            <p className="text-slate-600 text-xs mt-1">Tente ajustar os filtros acima.</p>
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
                    <button onClick={() => { setSelectedSerie('all'); setActiveFilterModal(null); }} className="p-3 text-left hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 text-slate-300 font-mono text-sm">Todas as Séries</button>
                    {SCHOOL_YEARS.map(year => (
                        <button 
                            key={year}
                            onClick={() => { setSelectedSerie(year); setActiveFilterModal(null); }}
                            className={`p-3 text-left rounded-lg border font-mono text-sm transition-colors ${selectedSerie === year ? 'bg-green-500/20 border-green-500 text-white' : 'hover:bg-white/5 border-transparent hover:border-white/10 text-slate-300'}`}
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
                    <button onClick={() => { setSelectedMateria('all'); setActiveFilterModal(null); }} className="col-span-2 p-3 text-left hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 text-slate-300 font-mono text-sm">Todas as Matérias</button>
                    {SUBJECTS_LIST.map(subj => (
                        <button 
                            key={subj}
                            onClick={() => { setSelectedMateria(subj); setActiveFilterModal(null); }}
                            className={`p-3 text-left rounded-lg border font-mono text-sm transition-colors ${selectedMateria === subj ? 'bg-green-500/20 border-green-500 text-white' : 'hover:bg-white/5 border-transparent hover:border-white/10 text-slate-300'}`}
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
                    <button 
                        onClick={() => { setSelectedStatus('all'); setActiveFilterModal(null); }} 
                        className={`p-3 text-left rounded-lg border font-mono text-sm transition-colors ${selectedStatus === 'all' ? 'bg-blue-500/20 border-blue-500 text-white' : 'hover:bg-white/5 border-transparent hover:border-white/10 text-slate-300'}`}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => { setSelectedStatus('nao_iniciado'); setActiveFilterModal(null); }} 
                        className={`p-3 text-left rounded-lg border font-mono text-sm transition-colors ${selectedStatus === 'nao_iniciado' ? 'bg-amber-500/20 border-amber-500 text-white' : 'hover:bg-white/5 border-transparent hover:border-white/10 text-slate-300'}`}
                    >
                        Pendentes
                    </button>
                    <button 
                        onClick={() => { setSelectedStatus('feito'); setActiveFilterModal(null); }} 
                        className={`p-3 text-left rounded-lg border font-mono text-sm transition-colors ${selectedStatus === 'feito' ? 'bg-emerald-500/20 border-emerald-500 text-white' : 'hover:bg-white/5 border-transparent hover:border-white/10 text-slate-300'}`}
                    >
                        Concluídos
                    </button>
                </div>
            </Modal>

        </div>
    );
};

export default Quizzes;
