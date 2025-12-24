
import React, { useState, useEffect } from 'react';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { useTeacherCommunicationContext } from '../contexts/TeacherCommunicationContext';
import { useNavigation } from '../contexts/NavigationContext';
import { Card } from './common/Card';
import { Modal } from './common/Modal';
import { ICONS, SpinnerIcon } from '../constants/index';
import type { TeacherClass, ClassNotice, Activity } from '../types';

// --- Sub-components ---

const NoticeListItem: React.FC<{ notice: ClassNotice }> = ({ notice }) => (
    <div className="flex items-start space-x-4 p-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
        <div className="flex-shrink-0 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 p-2 rounded-full">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 12.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3-3z" />
            </svg>
        </div>
        <div>
            <p className="text-sm text-slate-700 dark:text-slate-200">{notice.text}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {new Date(notice.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
    </div>
);

const CreateClassModal: React.FC<{ isOpen: boolean; onClose: () => void; onCreate: (name: string) => Promise<any> }> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsSubmitting(true);
        await onCreate(name);
        setIsSubmitting(false);
        setName('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nova Turma">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Turma</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ex: História - 8º Ano A"
                        className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        autoFocus
                    />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md dark:text-slate-300 dark:hover:bg-slate-700">Cancelar</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={!name.trim() || isSubmitting}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                    >
                        {isSubmitting ? <SpinnerIcon className="h-4 w-4 mr-2" /> : null}
                        Criar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const PostNoticeModal: React.FC<{ isOpen: boolean; onClose: () => void; onPost: (text: string) => Promise<void>; className: string }> = ({ isOpen, onClose, onPost, className }) => {
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setIsSubmitting(true);
        await onPost(text);
        setIsSubmitting(false);
        setText('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Aviso para ${className}`}>
            <div className="space-y-4">
                <textarea 
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={4}
                    placeholder="Digite seu aviso..."
                    className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    autoFocus
                />
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md dark:text-slate-300 dark:hover:bg-slate-700">Cancelar</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={!text.trim() || isSubmitting}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                    >
                        {isSubmitting ? <SpinnerIcon className="h-4 w-4 mr-2" /> : null}
                        Enviar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const ClassCard: React.FC<{ 
    classData: TeacherClass; 
    onOpen: () => void;
    onPostNotice: () => void;
}> = ({ classData, onOpen, onPostNotice }) => {
    const [isCopied, setIsCopied] = useState(false);

    const copyCode = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(classData.code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{classData.name}</h3>
                        <div 
                            onClick={copyCode}
                            className="inline-flex items-center gap-2 mt-1 px-2 py-1 bg-slate-100 dark:bg-slate-700/50 rounded cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="Clique para copiar o código"
                        >
                            <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">{classData.code}</span>
                            {isCopied ? (
                                <span className="text-green-500 text-[10px] font-bold">Copiado!</span>
                            ) : (
                                <div className="text-slate-400">{ICONS.copy}</div>
                            )}
                        </div>
                    </div>
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        {ICONS.teacher_dashboard}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <span className="block text-2xl font-bold text-slate-700 dark:text-slate-200">{classData.studentCount || (classData.students?.length || 0)}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Alunos</span>
                    </div>
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <span className="block text-2xl font-bold text-slate-700 dark:text-slate-200">{classData.noticeCount || (classData.notices?.length || 0)}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avisos</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <button 
                        onClick={onOpen}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <span>Gerenciar Turma</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    </button>
                    <button 
                        onClick={onPostNotice}
                        className="w-full py-2.5 px-4 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                        Postar Aviso
                    </button>
                </div>
            </div>
            
            {/* Recent Notices Preview */}
            {(classData.notices && classData.notices.length > 0) && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 p-4">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Último Aviso</p>
                    <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                        "{classData.notices[0].text}"
                    </div>
                </div>
            )}
        </div>
    );
};

const TeacherClassesList: React.FC = () => {
    const { teacherClasses, handleCreateClass, isLoadingClasses, fetchTeacherClasses } = useTeacherClassContext();
    const { handlePostNotice } = useTeacherCommunicationContext();
    const { openClass } = useNavigation();
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [noticeClass, setNoticeClass] = useState<TeacherClass | null>(null);

    // Refresh on mount to ensure list is up to date
    useEffect(() => {
        fetchTeacherClasses();
    }, []);

    const onPostNoticeWrapper = async (text: string) => {
        if (noticeClass) {
            await handlePostNotice(noticeClass.id, text);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Minhas Turmas</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie seus alunos, avisos e diários de classe.</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
                >
                    <div className="h-5 w-5 mr-2">{ICONS.plus}</div>
                    <span>Nova Turma</span>
                </button>
            </div>

            {isLoadingClasses ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : teacherClasses.length === 0 ? (
                <Card className="text-center py-16 border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="inline-block p-4 bg-white dark:bg-slate-700 rounded-full mb-4">
                        <div className="text-slate-400">{ICONS.teacher_dashboard}</div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Nenhuma turma encontrada</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">Crie sua primeira turma para começar a gerenciar seus alunos.</p>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                        Criar Turma Agora
                    </button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teacherClasses.map(cls => (
                        <ClassCard 
                            key={cls.id} 
                            classData={cls} 
                            onOpen={() => openClass(cls)}
                            onPostNotice={() => setNoticeClass(cls)}
                        />
                    ))}
                </div>
            )}

            <CreateClassModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onCreate={handleCreateClass} 
            />

            {noticeClass && (
                <PostNoticeModal 
                    isOpen={!!noticeClass} 
                    onClose={() => setNoticeClass(null)} 
                    onPost={onPostNoticeWrapper}
                    className={noticeClass.name}
                />
            )}
        </div>
    );
};

export default TeacherClassesList;
