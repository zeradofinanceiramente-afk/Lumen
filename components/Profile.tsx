
import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { useSettings, Theme } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { ICONS, SpinnerIcon } from '../constants/index';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import type { GuardianInvitation } from '../types';
import { useToast } from '../contexts/ToastContext';

const schoolYears = [
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)",
];

// Configuration for Theme Cards
interface ThemeConfig {
    id: Theme;
    label: string;
    bg: string;
    text: string;
    accent: string;
    border?: string;
}

const THEMES: ThemeConfig[] = [
    { id: 'light', label: 'Claro', bg: '#ffffff', text: '#1e293b', accent: '#4f46e5', border: '#e2e8f0' },
    { id: 'dark', label: 'Escuro', bg: '#0f172a', text: '#f1f5f9', accent: '#6366f1', border: '#1e293b' },
    { id: 'midnight', label: 'Midnight', bg: '#09090b', text: '#fafafa', accent: '#ffffff', border: '#27272a' },
    { id: 'nordic', label: 'Nordic', bg: '#2e3440', text: '#eceff4', accent: '#88c0d0', border: '#4c566a' },
    { id: 'forest', label: 'Forest', bg: '#050505', text: '#e2e8f0', accent: '#4ade80', border: '#4ade80' },
    { id: 'synthwave', label: 'Synthwave', bg: '#13111c', text: '#e879f9', accent: '#a78bfa', border: '#362f56' },
    { id: 'gruvbox', label: 'Gruvbox', bg: '#282828', text: '#ebdbb2', accent: '#fe8019', border: '#504945' },
    { id: 'dracula', label: 'Dracula', bg: '#282a36', text: '#f8f8f2', accent: '#bd93f9', border: '#44475a' },
    { id: 'high-contrast', label: 'Alto Contraste', bg: '#000000', text: '#ffff00', accent: '#ffffff', border: '#ffffff' },
    { id: 'morning-tide', label: 'Maré do Amanhecer', bg: '#F7F9FB', text: '#23527A', accent: '#FF8F7A', border: '#AFCBEF' },
    { id: 'akebono-dawn', label: 'Akebono', bg: '#FFF5F7', text: '#880E4F', accent: '#00E676', border: '#F8BBD0' },
    { id: 'dragon-year', label: 'Dragão (龙年)', bg: '#5D0E0E', text: '#FFD700', accent: '#B71C1C', border: '#FFD700' },
    { id: 'galactic-aurora', label: 'Aurora Galática', bg: '#0F1014', text: '#FFFFFF', accent: '#0055FF', border: '#2E2F3E' },
    { id: 'emerald-sovereignty', label: 'Emerald', bg: '#020403', text: '#D4AF37', accent: '#064E3B', border: '#34D399' },
    { id: 'itoshi-sae', label: 'Domínio Numérico', bg: '#080808', text: '#e0e0e0', accent: '#4fd1c5', border: '#4fd1c5' },
    { id: 'sorcerer-supreme', label: 'Muryōkūsho', bg: '#020617', text: '#f8fafc', accent: '#38bdf8', border: '#38bdf8' },
    { id: 'mn', label: 'Crimson', bg: '#1a1a1a', text: '#f0f0f0', accent: '#48bb78', border: '#333333' },
];

const PendingInvitationCard: React.FC<{ 
    invitation: GuardianInvitation; 
    onAccept: (id: string, guardianId: string) => void;
    onReject: (id: string) => void;
    isProcessing: boolean;
}> = ({ invitation, onAccept, onReject, isProcessing }) => (
    <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
                {invitation.inviterName}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
                Solicitou acesso ao seu perfil como responsável.
            </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <button 
                onClick={() => onReject(invitation.id)}
                disabled={isProcessing}
                className="flex-1 sm:flex-none px-4 py-2 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 disabled:opacity-50"
            >
                Recusar
            </button>
            <button 
                onClick={() => onAccept(invitation.id, invitation.inviterId)}
                disabled={isProcessing}
                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
            >
                {isProcessing ? <SpinnerIcon className="h-4 w-4" /> : 'Aceitar'}
            </button>
        </div>
    </div>
);

const Profile: React.FC = () => {
    const { user, userRole, updateUser } = useAuth();
    const { theme, setTheme, isHighContrastText, setIsHighContrastText } = useSettings();
    const { addToast } = useToast();
    
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [series, setSeries] = useState(user?.series || '');
    const [idCopied, setIdCopied] = useState(false);
    
    // Guardian Invitation State
    const [pendingInvites, setPendingInvites] = useState<GuardianInvitation[]>([]);
    const [isLoadingInvites, setIsLoadingInvites] = useState(false);
    const [isProcessingInvite, setIsProcessingInvite] = useState(false);

    useEffect(() => {
        setName(user?.name || '');
        setSeries(user?.series || '');
    }, [user]);

    // Fetch Invitations for Students
    useEffect(() => {
        if (userRole === 'aluno' && user) {
            const fetchInvites = async () => {
                setIsLoadingInvites(true);
                try {
                    const q = query(
                        collection(db, "invitations"),
                        where("inviteeId", "==", user.id),
                        where("type", "==", "guardian_access_request"),
                        where("status", "==", "pending")
                    );
                    const snap = await getDocs(q);
                    const invites = snap.docs.map(d => ({ id: d.id, ...d.data() } as GuardianInvitation));
                    setPendingInvites(invites);
                } catch (error) {
                    console.error("Error fetching invites:", error);
                } finally {
                    setIsLoadingInvites(false);
                }
            };
            fetchInvites();
        }
    }, [user, userRole]);

    const handleAcceptInvite = async (inviteId: string, guardianId: string) => {
        if (!user) return;
        setIsProcessingInvite(true);
        try {
            // 1. Update Guardian's Wards
            const guardianRef = doc(db, "users", guardianId);
            await updateDoc(guardianRef, {
                wards: arrayUnion(user.id)
            });

            // 2. Update Invitation Status
            const inviteRef = doc(db, "invitations", inviteId);
            await updateDoc(inviteRef, { status: 'accepted' });

            // 3. Remove from UI
            setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
            addToast("Vínculo com responsável aprovado!", "success");

        } catch (error) {
            console.error("Error accepting invite:", error);
            addToast("Erro ao aceitar solicitação.", "error");
        } finally {
            setIsProcessingInvite(false);
        }
    };

    const handleRejectInvite = async (inviteId: string) => {
        setIsProcessingInvite(true);
        try {
            await deleteDoc(doc(db, "invitations", inviteId));
            setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
            addToast("Solicitação recusada.", "info");
        } catch (error) {
            console.error("Error rejecting invite:", error);
            addToast("Erro ao recusar solicitação.", "error");
        } finally {
            setIsProcessingInvite(false);
        }
    };

    const handleSave = () => {
        if (!user) return;
        updateUser({ ...user, name, series });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setName(user?.name || '');
        setSeries(user?.series || '');
        setIsEditing(false);
    }

    const copyToClipboard = () => {
        if (!user) return;
        navigator.clipboard.writeText(user.id).then(() => {
            setIdCopied(true);
            setTimeout(() => setIdCopied(false), 2000);
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <p className="text-slate-500 dark:text-slate-400 -mt-6 hc-text-secondary">Gerencie suas informações e acompanhe seu progresso</p>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 hc-button-override">
                        Editar Perfil
                    </button>
                )}
            </div>

            <Card>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 hc-text-primary">Informações Pessoais</h2>
                <div className="flex justify-between items-center mb-4">
                    
                    {isEditing && (
                        <div className="flex space-x-2">
                            <button onClick={handleCancel} className="px-4 py-1.5 text-sm bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500 hc-button-override">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-1.5 text-sm bg-indigo-200 text-indigo-900 font-semibold rounded-lg hover:bg-indigo-300 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override">Salvar</button>
                        </div>
                    )}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Nome Completo</label>
                        {isEditing ? (
                             <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                        ) : (
                            <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-text-primary hc-border-override">{user?.name ?? 'Carregando...'}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Email</label>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-text-primary hc-border-override">{user?.email ?? 'Carregando...'}</p>
                    </div>
                     {userRole === 'aluno' && (
                        <div>
                            <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Ano Escolar</label>
                            {isEditing ? (
                                <select value={series} onChange={e => setSeries(e.target.value)} className="w-full font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                                    {schoolYears.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                            ) : (
                                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-text-primary hc-border-override">{user?.series ?? 'Não definido'}</p>
                            )}
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Papel no Sistema</label>
                        <p className="font-semibold text-blue-600 dark:text-blue-400 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-link-override hc-border-override capitalize">{userRole ?? 'N/A'}</p>
                    </div>
                </div>
            </Card>

            {/* Student ID & Invitations Section */}
            {userRole === 'aluno' && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 17h4a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h6l2 2h2a2 2 0 002-2z" />
                                    </svg>
                                    Acesso para Responsável
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                    Compartilhe este código com seus pais ou responsáveis. Quando eles solicitarem acesso, a notificação aparecerá aqui.
                                </p>
                            </div>
                            <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                <span className="font-mono text-slate-800 dark:text-slate-200 px-2 font-bold">{user?.id}</span>
                                <button 
                                    onClick={copyToClipboard}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                                    title="Copiar ID"
                                >
                                    {idCopied ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <span aria-hidden="true">{ICONS.copy}</span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Pending Requests */}
                        {pendingInvites.length > 0 && (
                            <div className="pt-4 border-t border-indigo-200 dark:border-indigo-800">
                                <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase tracking-wide">Solicitações Pendentes</h4>
                                <div className="space-y-3">
                                    {pendingInvites.map(invite => (
                                        <PendingInvitationCard 
                                            key={invite.id} 
                                            invitation={invite} 
                                            onAccept={handleAcceptInvite}
                                            onReject={handleRejectInvite}
                                            isProcessing={isProcessingInvite}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            <Card>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 hc-text-primary">Personalização & Acessibilidade</h2>
                <div className="space-y-6">
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary mb-3 block">Tema da Interface</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {THEMES.map(t => {
                                const isSelected = theme === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`relative h-24 rounded-xl transition-all duration-200 flex flex-col justify-between p-3 text-left overflow-hidden group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 ${
                                            isSelected 
                                                ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-md scale-[1.02]' 
                                                : 'hover:scale-[1.02] hover:shadow-sm'
                                        }`}
                                        style={{ 
                                            backgroundColor: t.bg, 
                                            color: t.text,
                                            border: `2px solid ${isSelected ? t.accent : (t.border || 'transparent')}` 
                                        }}
                                        aria-pressed={isSelected}
                                        aria-label={`Selecionar tema ${t.label}`}
                                    >
                                        <span className="font-bold text-sm tracking-wide z-10">{t.label}</span>
                                        
                                        {/* Accent color preview dot */}
                                        <div 
                                            className="w-3 h-3 rounded-full self-end mt-auto z-10" 
                                            style={{ backgroundColor: t.accent }}
                                        />

                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm z-20">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t border-slate-200 dark:border-slate-700 hc-border-override">
                        <div>
                            <label htmlFor="high-contrast-text-toggle" className="text-sm font-bold text-slate-700 dark:text-slate-200 hc-text-primary">
                                Texto em Alto Contraste
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Aumenta o peso e contraste das fontes para melhor legibilidade.</p>
                        </div>
                        <button
                            id="high-contrast-text-toggle"
                            type="button"
                            role="switch"
                            aria-checked={isHighContrastText}
                            onClick={() => setIsHighContrastText(!isHighContrastText)}
                            className={`${isHighContrastText ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800`}
                        >
                            <span className="sr-only">Ativar texto em alto contraste</span>
                            <span className={`${isHighContrastText ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`} />
                        </button>
                    </div>
                </div>
            </Card>
            
             <Card>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 hc-text-primary">Atalhos de Teclado</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 hc-text-secondary">Navegue mais rápido usando as teclas <kbd className="font-sans px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Alt</kbd> + <kbd className="font-sans px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Letra</kbd>.</p>
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-slate-300 hc-text-primary">
                    {userRole === 'aluno' ? (
                        <>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">D</kbd> - Dashboard</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">M</kbd> - Módulos</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">Q</kbd> - Quizzes</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">A</kbd> - Atividades</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">C</kbd> - Conquistas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">T</kbd> - Turmas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">P</kbd> - Perfil</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">N</kbd> - Notificações</li>
                        </>
                    ) : (
                        <>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">D</kbd> - Dashboard</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">M</kbd> - Minhas Turmas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">B</kbd> - Módulos</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">C</kbd> - Criar Módulo</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">A</kbd> - Criar Atividade</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">E</kbd> - Estatísticas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">P</kbd> - Perfil</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">N</kbd> - Notificações</li>
                        </>
                    )}
                </ul>
            </Card>
        </div>
    );
};

export default Profile;
