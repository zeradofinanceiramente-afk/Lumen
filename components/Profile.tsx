
import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { useSettings, Theme } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

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

const Profile: React.FC = () => {
    const { user, userRole, updateUser } = useAuth();
    
    const { theme, setTheme, isHighContrastText, setIsHighContrastText } = useSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [series, setSeries] = useState(user?.series || '');
    
    useEffect(() => {
        setName(user?.name || '');
        setSeries(user?.series || '');
    }, [user]);

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
