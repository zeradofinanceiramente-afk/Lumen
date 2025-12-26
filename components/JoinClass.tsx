
import React, { useState } from 'react';
import type { TeacherClass, ClassNotice } from '../types';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { ICONS, SpinnerIcon } from '../constants/index';
import { Modal } from './common/Modal';

// --- Assets & Icons (Gamer Themed) ---
const RankIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 2a1 1 0 01.894.553l2.448 4.964 5.478.796a1 1 0 01.554 1.705l-3.963 3.864.936 5.46a1 1 0 01-1.45 1.054L10 17.882l-4.898 2.576a1 1 0 01-1.45-1.054l.936-5.46-3.963-3.864a1 1 0 01.554-1.705l5.478-.796L9.106 2.553A1 1 0 0110 2z" clipRule="evenodd" />
    </svg>
);

const ControllerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

// --- Sub-components ---

const NoticeLogItem: React.FC<{ notice: ClassNotice }> = ({ notice }) => {
    return (
        <div className="relative pl-6 pb-6 border-l border-white/10 last:pb-0 group">
            <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-slate-600 group-hover:border-green-500 group-hover:bg-green-500 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
            <div className="bg-[#161b22] border border-white/5 p-3 rounded-r-lg rounded-bl-lg group-hover:border-white/20 transition-all">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono text-green-400 uppercase tracking-wider font-bold">
                        {notice.author.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                        {new Date(notice.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <p className="text-sm text-slate-300 font-medium leading-relaxed font-mono">
                    {notice.text}
                </p>
            </div>
        </div>
    );
};

const GamerClassCard: React.FC<{
    classData: TeacherClass;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onLeaveClick: (classId: string, className: string) => void;
}> = ({ classData, isExpanded, onToggleExpand, onLeaveClick }) => {
    const totalNoticeCount = classData.noticeCount ?? classData.notices?.length ?? 0;
    
    // Background based on ID to simulate variability
    const bgIndex = (classData.id.charCodeAt(0) % 3) + 1; 
    
    return (
        <div className={`relative group transition-all duration-300 ${isExpanded ? 'col-span-1 md:col-span-2 lg:col-span-3' : ''}`}>
            {/* Main Card */}
            <div 
                onClick={onToggleExpand}
                className={`
                    relative overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer
                    ${isExpanded 
                        ? 'bg-[#0d1117] border-green-500 shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
                        : 'bg-[#0d1117] border-white/5 hover:border-white/20 hover:translate-y-[-4px] hover:shadow-xl'
                    }
                `}
            >
                {/* Header / Banner */}
                <div className="relative h-24 bg-gradient-to-r from-slate-900 to-black p-4 flex justify-between items-start">
                    {/* Abstract Grid Texture */}
                    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] bg-no-repeat animate-[shine_3s_infinite]" />

                    <div className="relative z-10">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white border border-white/10 mb-1">
                            CODE: {classData.code}
                        </span>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight italic">
                            {classData.name}
                        </h3>
                    </div>
                    
                    <div className="relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isExpanded ? 'bg-green-500 text-black border-green-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            {isExpanded ? '▼' : '▶'}
                        </div>
                    </div>
                </div>

                {/* Body Stats */}
                <div className="p-4 grid grid-cols-2 gap-4 bg-[#161b22]">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Host (Prof)</p>
                        <p className="text-sm font-semibold text-slate-300 truncate">
                            {Object.values(classData.teacherNames || {})[0] || 'Unknown'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Intel (Avisos)</p>
                        <p className={`text-sm font-mono font-bold ${totalNoticeCount > 0 ? 'text-green-400' : 'text-slate-600'}`}>
                            {totalNoticeCount}
                        </p>
                    </div>
                </div>

                {/* Progress Bar Decoration */}
                <div className="h-1 w-full bg-slate-800">
                    <div className={`h-full ${isExpanded ? 'bg-green-500' : 'bg-slate-600 group-hover:bg-green-500/50'} w-[75%] transition-colors duration-500`}></div>
                </div>
            </div>

            {/* Expanded Content (The "Lobby") */}
            {isExpanded && (
                <div className="mt-2 p-4 bg-black/40 border border-white/10 border-t-0 rounded-b-xl animate-fade-in relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0d1117] rotate-45 -mt-2 border-l border-t border-green-500"></div>
                    
                    <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                        <h4 className="text-sm font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Mission Logs
                        </h4>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onLeaveClick(classData.id, classData.name);
                            }}
                            className="px-3 py-1 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 rounded text-xs font-bold uppercase transition-colors"
                        >
                            Abort Mission (Sair)
                        </button>
                    </div>

                    {(classData.notices?.length || 0) > 0 ? (
                        <div className="custom-scrollbar max-h-60 overflow-y-auto">
                            {classData.notices?.map(notice => <NoticeLogItem key={notice.id} notice={notice} />)}
                        </div>
                    ) : (
                        <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-lg">
                            <p className="text-xs text-slate-600 font-mono uppercase">Nenhum dado de inteligência encontrado.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const JoinClass: React.FC = () => {
    const { studentClasses, handleJoinClass, handleLeaveClass } = useStudentAcademic();
    const [classCode, setClassCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    
    // Modal States
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [classToLeave, setClassToLeave] = useState<{id: string, name: string} | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);
    
    const safeStudentClasses = studentClasses || [];

    const onJoin = async () => {
        if (!classCode.trim() || isJoining) return;
        setIsJoining(true);
        const success = await handleJoinClass(classCode.trim().toUpperCase());
        setIsJoining(false);
        if (success) {
            setClassCode('');
        }
    };

    const handleLeaveClick = (classId: string, className: string) => {
        setClassToLeave({ id: classId, name: className });
        setIsLeaveModalOpen(true);
    };

    const confirmLeave = async () => {
        if (!classToLeave || isLeaving) return;
        setIsLeaving(true);
        try {
            await handleLeaveClass(classToLeave.id);
            setIsLeaveModalOpen(false);
            setClassToLeave(null);
        } catch (error) {
            // Error handled in hook
        } finally {
            setIsLeaving(false);
        }
    };

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Header / Join Section */}
            <div className="relative bg-[#0d1117] border border-white/10 rounded-2xl p-6 md:p-8 overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-green-500/10 transition-colors duration-500"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-2">
                            Entrar na Sessão
                        </h2>
                        <p className="text-slate-400 font-mono text-sm">
                            Insira o código de acesso fornecido pelo administrador da missão (Professor).
                        </p>
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-2">
                        <div className="flex bg-black p-1 rounded-xl border border-white/20 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500/50 transition-all shadow-lg">
                            <input 
                                type="text" 
                                value={classCode}
                                onChange={(e) => setClassCode(e.target.value)}
                                placeholder="CÓDIGO (EX: A1B2C3)"
                                className="bg-transparent text-white font-mono font-bold text-lg px-4 py-3 outline-none w-full md:w-64 placeholder:text-slate-700 uppercase"
                            />
                            <button 
                                onClick={onJoin}
                                disabled={isJoining}
                                className="bg-green-600 hover:bg-green-500 text-black font-bold px-6 rounded-lg uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                            >
                                {isJoining ? <SpinnerIcon className="text-black h-5 w-5" /> : 'START'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Class Grid */}
            <div>
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1 h-6 bg-green-500 block"></span>
                        Minhas Turmas
                    </h2>
                    <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-slate-300">
                        {safeStudentClasses.length} ATIVAS
                    </span>
                </div>

                {safeStudentClasses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {safeStudentClasses.map(cls => (
                            <GamerClassCard
                                key={cls.id}
                                classData={cls}
                                isExpanded={expandedClassId === cls.id}
                                onToggleExpand={() => setExpandedClassId(prev => prev === cls.id ? null : cls.id)}
                                onLeaveClick={handleLeaveClick}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-2xl bg-black/20">
                        <div className="text-6xl mb-4 opacity-20 text-white">🎮</div>
                        <p className="text-slate-500 font-mono uppercase tracking-widest">Nenhuma missão em andamento.</p>
                        <p className="text-slate-600 text-xs mt-2">Use o código acima para entrar em uma turma.</p>
                    </div>
                )}
            </div>

            {/* Modal de Confirmação de Saída (Redesigned) */}
            <Modal 
                isOpen={isLeaveModalOpen} 
                onClose={() => !isLeaving && setIsLeaveModalOpen(false)} 
                title="⚠ ABORTAR MISSÃO?"
            >
                <div className="space-y-4 font-mono">
                    <p className="text-slate-300">
                        Você está prestes a sair da turma <strong className="text-white bg-red-900/20 px-1">{classToLeave?.name}</strong>.
                    </p>
                    <div className="bg-red-900/10 border border-red-500/30 p-4 rounded text-xs text-red-300">
                        [AVISO DO SISTEMA]: Seu progresso será arquivado, mas você perderá acesso a novas atividades e ao chat desta turma.
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                        <button 
                            onClick={() => setIsLeaveModalOpen(false)}
                            disabled={isLeaving}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors uppercase font-bold text-xs"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmLeave}
                            disabled={isLeaving}
                            className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-500 flex items-center gap-2 uppercase text-xs shadow-lg shadow-red-900/20"
                        >
                            {isLeaving ? <SpinnerIcon className="h-3 w-3" /> : null}
                            Confirmar Saída
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default JoinClass;
    