
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { useTeacherCommunicationContext } from '../contexts/TeacherCommunicationContext';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon, SUBJECTS_LIST } from '../constants/index';
import { Modal } from './common/Modal';
import type { Turno, AttendanceSession, AttendanceRecord, AttendanceStatus, Activity } from '../types';
import { collection, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseClient';
import { useAuth } from '../contexts/AuthContext';

// --- Helper Components ---
const InputField: React.FC<{ label: string, required?: boolean, children: React.ReactNode }> = ({ label, required, children }) => (
    <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

// --- Modal: Invite Teacher ---
interface InviteTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (email: string, subject: string) => Promise<void>;
    isLoading: boolean;
}

const InviteTeacherModal: React.FC<InviteTeacherModalProps> = ({ isOpen, onClose, onInvite, isLoading }) => {
    const [email, setEmail] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

    const handleSubmit = () => {
        if (email && selectedSubjects.length > 0 && !isLoading) {
            const subjectString = selectedSubjects.join(', ');
            onInvite(email, subjectString);
        }
    };

    const toggleSubject = (subject: string) => {
        setSelectedSubjects(prev => 
            prev.includes(subject) 
                ? prev.filter(s => s !== subject) 
                : [...prev, subject]
        );
    };

    useEffect(() => {
        if (isOpen) {
            setEmail('');
            setSelectedSubjects([]);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Convidar Co-Docente">
            <div className="space-y-6">
                <p className="text-sm text-slate-400">
                    Adicione permissões de acesso para outro professor.
                </p>
                
                <InputField label="Email do Professor" required>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="exemplo@escola.com"
                        className="w-full p-3 bg-[#0d1117] border border-slate-700 rounded-lg text-white focus:border-indigo-500 outline-none" 
                    />
                </InputField>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                        Disciplinas <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                        {SUBJECTS_LIST.map(subj => {
                            const isSelected = selectedSubjects.includes(subj);
                            return (
                                <button
                                    key={subj}
                                    type="button"
                                    onClick={() => toggleSubject(subj)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-all ${
                                        isSelected 
                                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                                            : 'bg-[#0d1117] border-slate-700 text-slate-400 hover:border-slate-500'
                                    }`}
                                >
                                    {isSelected ? `[x] ${subj}` : `[ ] ${subj}`}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end items-center pt-4 space-x-3 border-t border-white/10 mt-6">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isLoading || !email || selectedSubjects.length === 0} 
                        className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center min-w-[140px] shadow-lg"
                    >
                        {isLoading ? <SpinnerIcon /> : 'Enviar Convite'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- Attendance Item ---
const AttendanceStudentItem: React.FC<{ 
    record: AttendanceRecord; 
    canEdit: boolean; 
    onUpdateStatus: (status: AttendanceStatus) => void;
    isUpdating: boolean;
}> = ({ record, canEdit, onUpdateStatus, isUpdating }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-white/5 hover:border-white/10 transition-colors group">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                    record.status === 'presente' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' :
                    record.status === 'ausente' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' :
                    'bg-slate-600'
                }`} />
                <div>
                    <p className="font-semibold text-slate-200 text-sm">{record.studentName}</p>
                    <p className="text-[10px] font-mono uppercase text-slate-500">
                        {record.status === 'pendente' ? 'Aguardando' : record.status}
                    </p>
                </div>
            </div>
            
            <div className="flex space-x-1 opacity-50 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onUpdateStatus('presente')}
                    disabled={!canEdit || isUpdating}
                    className={`p-2 rounded-md transition-colors ${
                        record.status === 'presente' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-white/5 text-slate-500 hover:bg-green-500/10 hover:text-green-400'
                    }`}
                    title="Presente"
                >
                    P
                </button>
                <button
                    onClick={() => onUpdateStatus('ausente')}
                    disabled={!canEdit || isUpdating}
                    className={`p-2 rounded-md transition-colors ${
                        record.status === 'ausente' 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-white/5 text-slate-500 hover:bg-red-500/10 hover:text-red-400'
                    }`}
                    title="Ausente"
                >
                    F
                </button>
            </div>
        </div>
    );
};

// --- Attendance Detail View ---
const AttendanceSessionView: React.FC<{ session: AttendanceSession, onBack: () => void }> = ({ session, onBack }) => {
    const { handleUpdateAttendanceStatus } = useTeacherClassContext();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const canEdit = useMemo(() => {
        if (!session.createdAt) return true;
        const createdDate = new Date(session.createdAt);
        if (isNaN(createdDate.getTime())) return true;
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays <= 7;
    }, [session.createdAt]);

    useEffect(() => {
        let mounted = true;
        const fetchRecords = async () => {
            try {
                const recordsRef = collection(db, "attendance_sessions", session.id, "records");
                const snapshot = await getDocs(recordsRef);
                if (!mounted) return;
                
                const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
                data.sort((a, b) => a.studentName.localeCompare(b.studentName));
                setRecords(data);
            } catch (error) { console.error(error); } finally { if (mounted) setLoading(false); }
        };
        fetchRecords();
        return () => { mounted = false; };
    }, [session.id]);

    const onUpdateStatus = async (recordId: string, status: AttendanceStatus) => {
        if (!canEdit) return;
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status } : r));
        setUpdatingId(recordId);
        try { await handleUpdateAttendanceStatus(session.id, recordId, status); } 
        catch (error) { console.error(error); } 
        finally { setUpdatingId(null); }
    };

    const stats = useMemo(() => {
        const total = records.length;
        const present = records.filter(r => r.status === 'presente').length;
        const absent = records.filter(r => r.status === 'ausente').length;
        const pending = total - present - absent;
        return { total, present, absent, pending };
    }, [records]);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4 border-b border-white/10 pb-4">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div>
                    <h2 className="text-xl font-bold text-white">
                        Chamada: {new Date(session.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </h2>
                    <p className="text-xs font-mono text-slate-500 capitalize">
                        {session.turno} • {session.horario}º Horário
                    </p>
                </div>
                <div className="flex-grow" />
                 {!canEdit && (
                    <span className="bg-red-900/30 text-red-400 text-[10px] font-bold px-3 py-1 rounded-full border border-red-500/30">
                        LOCKED
                    </span>
                )}
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0d1117] p-3 rounded-lg border border-green-500/20 text-center">
                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Presentes</p>
                    <p className="text-2xl font-bold text-white">{stats.present}</p>
                </div>
                <div className="bg-[#0d1117] p-3 rounded-lg border border-red-500/20 text-center">
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Ausentes</p>
                    <p className="text-2xl font-bold text-white">{stats.absent}</p>
                </div>
                 <div className="bg-[#0d1117] p-3 rounded-lg border border-white/10 text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pendentes</p>
                    <p className="text-2xl font-bold text-white">{stats.pending}</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10"><SpinnerIcon className="h-8 w-8 text-brand mx-auto" /></div>
            ) : records.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/10 rounded-lg">
                    <p className="text-slate-500 text-sm">Nenhum aluno nesta lista.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {records.map(record => (
                        <AttendanceStudentItem
                            key={record.id}
                            record={record}
                            canEdit={canEdit}
                            isUpdating={updatingId === record.id}
                            onUpdateStatus={(status) => onUpdateStatus(record.id, status)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const SessionList: React.FC<{ sessions: AttendanceSession[], onSelectSession: (session: AttendanceSession) => void }> = ({ sessions, onSelectSession }) => {
    const groupedSessions = useMemo(() => {
        const grouped: Record<string, AttendanceSession[]> = {};
        sessions.forEach(session => {
            if (!grouped[session.date]) grouped[session.date] = [];
            grouped[session.date].push(session);
        });
        return grouped;
    }, [sessions]);
    
    const sortedDates = useMemo(() => Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a)), [groupedSessions]);

    if (sessions.length === 0) {
        return (
             <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                <p className="text-slate-500">Nenhum registro de chamada.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {sortedDates.map((date) => (
                <div key={date} className="bg-[#0d1117] rounded-lg border border-white/5 overflow-hidden">
                    <div className="px-4 py-2 bg-white/5 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5">
                        {new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </div>
                    {groupedSessions[date].sort((a, b) => a.horario - b.horario).map(session => (
                        <button 
                            key={session.id} 
                            onClick={() => onSelectSession(session)}
                            className="w-full text-left p-3 hover:bg-white/5 transition-colors flex justify-between items-center group border-b border-white/5 last:border-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${session.turno === 'matutino' ? 'bg-yellow-500' : session.turno === 'vespertino' ? 'bg-orange-500' : 'bg-indigo-500'}`} />
                                <span className="text-sm font-medium text-slate-300 group-hover:text-white capitalize">
                                    {session.turno} <span className="text-slate-600 mx-1">/</span> {session.horario}º Hor.
                                </span>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600 group-hover:text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
};

const ClassView: React.FC = () => {
    const { user } = useAuth();
    const { activeClass, exitClass, startGrading } = useNavigation();
    
    const { handleCreateAttendanceSession, fetchClassDetails, attendanceSessionsByClass, handleUpdateAttendanceStatus, isSubmittingClass, handleLeaveClass, handleArchiveClass } = useTeacherClassContext();
    const { handleInviteTeacher, isSubmittingComm } = useTeacherCommunicationContext();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [turno, setTurno] = useState<Turno>('matutino');
    const [horario, setHorario] = useState<number>(1);

    useEffect(() => {
        if (activeClass && !activeClass.isFullyLoaded) {
            fetchClassDetails(activeClass.id);
        }
    }, [activeClass, fetchClassDetails]);

    const sessions = activeClass ? (attendanceSessionsByClass[activeClass.id] || []) : [];
    const isOwner = user && activeClass && activeClass.teacherId === user.id;

    if (!activeClass) return <div className="p-8 text-center text-slate-500">Carregando...</div>;

    const handleCreate = async () => {
        if (!date || !activeClass) return;
        await handleCreateAttendanceSession(activeClass.id, date, turno, horario);
        setIsModalOpen(false);
    };

    const confirmLeave = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try { await handleLeaveClass(activeClass.id); setIsLeaveModalOpen(false); exitClass(); } 
        catch (error) {} finally { setIsProcessing(false); }
    }

    const confirmArchive = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try { await handleArchiveClass(activeClass.id); setIsArchiveModalOpen(false); exitClass(); } 
        catch (error) {} finally { setIsProcessing(false); }
    }

    if (selectedSession) {
        return (
            <Card className="border-t-4 border-brand">
                <AttendanceSessionView session={selectedSession} onBack={() => setSelectedSession(null)} />
            </Card>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Dark/Gaming Header */}
            <div className="relative rounded-2xl bg-[#0d1117] border border-white/10 p-6 overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <span className="text-9xl font-mono font-bold text-white select-none pointer-events-none">
                        {activeClass.code.substring(0, 2)}
                    </span>
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <button onClick={exitClass} className="text-slate-500 hover:text-white flex items-center gap-2 text-sm mb-3 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" /></svg>
                            Voltar para Dashboard
                        </button>
                        <h1 className="text-4xl font-bold text-white tracking-tight">{activeClass.name}</h1>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-mono text-brand border border-brand/20">
                                CODE: {activeClass.code}
                            </span>
                            <span className="text-xs text-slate-400">
                                {activeClass.studentCount || (activeClass.students?.length || 0)} Alunos Ativos
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {isOwner && (
                            <>
                                <button onClick={() => setIsArchiveModalOpen(true)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 text-xs font-bold hover:text-white hover:bg-white/10 transition-colors uppercase tracking-wide">
                                    Arquivar
                                </button>
                                <button onClick={() => setIsInviteModalOpen(true)} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-500/20 transition-colors uppercase tracking-wide">
                                    + Co-Docente
                                </button>
                            </>
                        )}
                        {!isOwner && (
                            <button onClick={() => setIsLeaveModalOpen(true)} className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors uppercase tracking-wide">
                                Sair
                            </button>
                        )}
                        <button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-brand text-black font-bold rounded-lg hover:bg-brand/90 hover:shadow-[0_0_15px_rgba(var(--brand-rgb),0.4)] transition-all flex items-center gap-2">
                            <div className="h-4 w-4">{ICONS.plus}</div>
                            <span>Nova Chamada</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1: Activities & Logs */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-0 overflow-hidden border-t-4 border-indigo-500">
                        <div className="p-5 border-b border-white/10 bg-[#0d1117] flex justify-between items-center">
                            <h2 className="font-bold text-white flex items-center gap-2">
                                <span className="text-indigo-500">{ICONS.teacher_create_module}</span>
                                Atividades Recentes
                            </h2>
                        </div>
                        <div className="p-2 space-y-1 bg-[#09090b]">
                            {activeClass.activities && activeClass.activities.length > 0 ? (
                                activeClass.activities.map(activity => (
                                    <div key={activity.id} className="p-4 rounded-lg hover:bg-white/5 flex justify-between items-center group transition-colors cursor-default">
                                        <div>
                                            <p className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">{activity.title}</p>
                                            <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                                <span>{activity.submissionCount ?? 0} Envios</span>
                                                <span>•</span>
                                                <span className={activity.pendingSubmissionCount ? 'text-yellow-500' : ''}>
                                                    {activity.pendingSubmissionCount ?? 0} Pendentes
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => startGrading(activity)} 
                                            className="px-4 py-2 text-xs font-bold text-indigo-400 border border-indigo-500/30 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                                        >
                                            Inspecionar
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-xs text-slate-600 py-8 uppercase tracking-widest">Sem dados de atividade</p>
                            )}
                        </div>
                    </Card>

                    <Card className="border-t-4 border-emerald-500">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-emerald-500">{ICONS.chamada}</span>
                            Log de Presença
                        </h2>
                        <SessionList sessions={sessions} onSelectSession={setSelectedSession} />
                    </Card>
                </div>
                
                {/* Column 2: Roster & Staff */}
                <div className="space-y-6">
                    <Card className="bg-[#0d1117] border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Corpo Docente</h3>
                            <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">
                                {activeClass.teachers?.length || 1} Staff
                            </span>
                        </div>
                        <div className="space-y-2">
                            {(activeClass.teachers || [activeClass.teacherId]).map((tid) => (
                                <div key={tid} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors">
                                    <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                        {(activeClass.teacherNames?.[tid] || 'P').charAt(0)}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-medium text-white truncate">
                                            {activeClass.teacherNames?.[tid] || 'Professor'}
                                            {user?.id === tid && <span className="ml-2 text-[10px] text-slate-500">(Você)</span>}
                                        </p>
                                        <p className="text-[10px] text-slate-500 uppercase">{activeClass.subjects?.[tid] || 'Regente'}</p>
                                    </div>
                                    {tid === activeClass.teacherId && <span className="text-[10px] text-amber-500 font-bold">OWNER</span>}
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="flex-1 flex flex-col p-0 overflow-hidden bg-[#09090b] border-white/10">
                        <div className="p-4 border-b border-white/10 bg-[#0d1117]">
                            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Lista de Alunos</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[400px] p-2 custom-scrollbar">
                            {activeClass.students && activeClass.students.length > 0 ? (
                                activeClass.students.filter(s => s.status !== 'inactive').map(student => (
                                    <div key={student.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors group">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold group-hover:border-slate-500 group-hover:text-white">
                                            {student.name.charAt(0)}
                                        </div>
                                        <span className="text-sm text-slate-400 group-hover:text-white truncate transition-colors">{student.name}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-xs text-slate-600 py-8">Lista vazia</p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Sessão de Chamada">
                <div className="space-y-4">
                    <InputField label="Data">
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-[#0d1117] border border-slate-700 rounded-lg text-white outline-none focus:border-brand" />
                    </InputField>
                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map(h => (
                            <button key={h} onClick={() => setHorario(h)} className={`p-2 text-sm font-bold rounded border ${horario === h ? 'bg-brand text-black border-brand' : 'bg-[#0d1117] border-slate-700 text-slate-400 hover:border-slate-500'}`}>{h}º Hor.</button>
                        ))}
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={handleCreate} disabled={isSubmittingClass} className="px-6 py-2 bg-brand text-black font-bold rounded-lg hover:bg-brand/90 disabled:opacity-50">
                            {isSubmittingClass ? <SpinnerIcon /> : 'Iniciar Sessão'}
                        </button>
                    </div>
                </div>
            </Modal>

            <InviteTeacherModal 
                isOpen={isInviteModalOpen} 
                onClose={() => setIsInviteModalOpen(false)} 
                onInvite={async (e, s) => { await handleInviteTeacher(activeClass.id, e, s); setIsInviteModalOpen(false); }}
                isLoading={isSubmittingComm}
            />

            <Modal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="Arquivar Turma">
                <div className="space-y-4">
                    <p className="text-slate-300 text-sm">Esta ação moverá a turma para o histórico. Deseja continuar?</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsArchiveModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                        <button onClick={confirmArchive} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded hover:bg-red-500/30">Arquivar</button>
                    </div>
                </div>
            </Modal>

             <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Sair da Turma">
                <div className="space-y-4">
                    <p className="text-slate-300 text-sm">Você perderá acesso a esta turma. Confirmar saída?</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsLeaveModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                        <button onClick={confirmLeave} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded hover:bg-red-500/30">Sair</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ClassView;
