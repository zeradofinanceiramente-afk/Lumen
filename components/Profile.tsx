
import React, { useState, useEffect, useMemo } from 'react';
import { useSettings, PRESET_THEMES } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { compressImage } from '../utils/imageCompression';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseStorage';
import { useStudentGamificationContext } from '../contexts/StudentGamificationContext';

const schoolYears = [
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)",
];

// =============================================================================
// SHARED TYPES & UTILS
// =============================================================================

interface ProfileViewProps {
    user: any;
    userRole: string | null;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    name: string; setName: (v: string) => void;
    series: string; setSeries: (v: string) => void;
    avatarUrl: string; setAvatarUrl: (v: string) => void;
    handleSave: () => void;
    handleAvatarFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploadingAvatar: boolean;
    handleWallpaperChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploadingWallpaper: boolean;
    wallpaper: string | null;
    removeWallpaper: () => void;
}

// =============================================================================
// 🎮 GAMIFIED UI COMPONENTS (Student & Admin)
// =============================================================================

const SlashContainer: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
    <div className={`relative group ${className}`}>
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-600/50" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-600/50" />
        <div className="bg-black/60 backdrop-blur-xl border-l-2 border-r-2 border-white/5 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_2px,3px_100%] opacity-20" />
            <div className="relative z-10">{children}</div>
        </div>
    </div>
);

const StylishInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="group relative mb-6">
        <label className="block text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] mb-1 group-focus-within:text-red-400 transition-colors">
            {label}
        </label>
        <input 
            {...props}
            className="w-full bg-transparent border-b border-white/20 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-red-500 focus:bg-red-900/10 transition-all placeholder:text-slate-700"
        />
        <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-red-500 group-focus-within:w-full transition-all duration-500 ease-out" />
    </div>
);

const StylishSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div className="group relative mb-6">
        <label className="block text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] mb-1">
            {label}
        </label>
        <select 
            {...props}
            className="w-full bg-black/50 border-b border-white/20 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-red-500 transition-all appearance-none cursor-pointer"
        >
            {children}
        </select>
        <div className="absolute right-0 top-6 pointer-events-none text-red-500 text-xs">▼</div>
    </div>
);

const SlashButton: React.FC<{ 
    onClick?: () => void; 
    children: React.ReactNode; 
    variant?: 'primary' | 'secondary' | 'danger'; 
    disabled?: boolean;
}> = ({ onClick, children, variant = 'primary', disabled }) => {
    let colors = "";
    if (variant === 'primary') colors = "bg-red-700 text-white border-red-900 hover:bg-red-600";
    if (variant === 'secondary') colors = "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white";
    if (variant === 'danger') colors = "bg-transparent text-red-500 border-red-900/50 hover:bg-red-900/20";

    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`relative px-8 py-3 font-bold uppercase tracking-widest text-sm transform -skew-x-12 transition-all duration-200 border-l-4 border-r-4 ${colors} disabled:opacity-50 disabled:cursor-not-allowed group`}
        >
            <span className="block transform skew-x-12">{children}</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>
    );
};

const GamifiedProfileView: React.FC<ProfileViewProps> = (props) => {
    const { 
        theme, applyThemePreset, enableWallpaperMask, setEnableWallpaperMask, 
        enableFocusMode, setEnableFocusMode, accentColor, setAccentColor,
        fontProfile, setFontProfile // Consumindo novos valores
    } = useSettings();
    
    // Tentativa segura de obter contexto de gamificação (pode falhar para Admin se não estiver no provider)
    let userStats: any = { level: 99, xp: 9999 };
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const ctx = useStudentGamificationContext();
        if (ctx) userStats = ctx.userStats;
    } catch { 
        // Admin fallback
    }

    const styleRank = useMemo(() => {
        const level = userStats?.level || 1;
        if (level >= 50) return { label: 'SSS', color: 'text-yellow-400' };
        if (level >= 40) return { label: 'SS', color: 'text-orange-400' };
        if (level >= 30) return { label: 'S', color: 'text-red-600' };
        if (level >= 20) return { label: 'A', color: 'text-green-400' };
        if (level >= 10) return { label: 'B', color: 'text-blue-400' };
        return { label: 'D', color: 'text-slate-500' };
    }, [userStats]);

    const { user, isEditing, setIsEditing, name, setName, series, setSeries, avatarUrl, setAvatarUrl, handleSave, handleAvatarFileChange, isUploadingAvatar, handleWallpaperChange, isUploadingWallpaper, wallpaper, removeWallpaper } = props;
    const [avatarMode, setAvatarMode] = useState<'upload' | 'url'>('upload');

    return (
        <div className="min-h-screen animate-fade-in pb-20 font-sans">
            <div className="relative mb-12 py-8 border-b border-white/10">
                <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter opacity-90 relative z-10" style={{ textShadow: '0 0 30px rgba(255,0,0,0.5)' }}>
                    Configurar <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-900">Perfil</span>
                </h1>
                <p className="text-slate-400 font-mono tracking-[0.3em] uppercase text-xs mt-2 relative z-10">
                    Configuração de Sistema & Identidade // {props.userRole === 'admin' ? 'ADMIN_MODE' : 'STUDENT_MODE'}
                </p>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5 space-y-8">
                    {/* Rank Card */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-black border border-white/10 p-6 flex items-center gap-6 overflow-hidden">
                            <div className="relative w-32 h-32 flex-shrink-0">
                                <div className="absolute inset-0 bg-red-600 rotate-45 opacity-20 animate-pulse"></div>
                                <div className="absolute inset-2 border-2 border-white/20 rotate-45 overflow-hidden bg-black">
                                    {(isEditing ? (avatarMode === 'url' ? avatarUrl : avatarUrl) : user?.avatarUrl) ? (
                                        <img src={isEditing ? avatarUrl : user?.avatarUrl} alt="Avatar" className="w-full h-full object-cover -rotate-45 scale-150" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center -rotate-45">
                                            <span className="text-4xl text-slate-700 font-black">{user?.name?.charAt(0)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-2 -right-2 z-20">
                                    <span className={`text-6xl font-black ${styleRank.color} drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]`} style={{ fontFamily: "'Cinzel', serif" }}>
                                        {styleRank.label}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-bold text-white uppercase truncate">{user?.name}</h2>
                                <p className="text-red-500 text-xs font-mono tracking-widest uppercase mb-4">{user?.role} // {user?.series || 'N/A'}</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] text-slate-400 font-mono uppercase">
                                        <span>XP</span><span>{userStats?.xp}</span>
                                    </div>
                                    <div className="h-1 w-full bg-slate-900 overflow-hidden"><div className="h-full bg-red-600 w-3/4 shadow-[0_0_10px_red]"></div></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <SlashContainer>
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                            <h3 className="text-lg font-bold text-slate-200 uppercase italic">Dados do Operador</h3>
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider transition-colors">[ Editar ]</button>
                            )}
                        </div>
                        <div className="space-y-4">
                            {isEditing ? (
                                <>
                                    <div className="mb-6 p-4 bg-red-900/10 border border-red-900/30">
                                        <label className="text-[10px] font-bold text-red-400 uppercase block mb-2">Avatar Source</label>
                                        <div className="flex gap-4 mb-3">
                                            <button onClick={() => setAvatarMode('upload')} className={`text-xs uppercase font-bold px-3 py-1 ${avatarMode === 'upload' ? 'bg-red-600 text-white' : 'text-slate-500 border border-slate-700'}`}>Upload</button>
                                            <button onClick={() => setAvatarMode('url')} className={`text-xs uppercase font-bold px-3 py-1 ${avatarMode === 'url' ? 'bg-red-600 text-white' : 'text-slate-500 border border-slate-700'}`}>URL</button>
                                        </div>
                                        {avatarMode === 'upload' ? (
                                            <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="text-xs text-slate-400 file:bg-slate-800 file:text-white file:border-0 file:px-2 file:py-1 file:mr-2 cursor-pointer" />
                                        ) : (
                                            <input type="text" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full bg-black border-b border-slate-700 text-xs p-1 text-white focus:border-red-500 outline-none" />
                                        )}
                                    </div>
                                    <StylishInput label="Nome de Código" value={name} onChange={e => setName(e.target.value)} />
                                    {props.userRole === 'aluno' && (
                                        <StylishSelect label="Nível de Acesso (Série)" value={series} onChange={e => setSeries(e.target.value)}>
                                            {schoolYears.map(year => <option key={year} value={year}>{year}</option>)}
                                        </StylishSelect>
                                    )}
                                    <div className="flex gap-4 mt-8">
                                        <SlashButton variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</SlashButton>
                                        <SlashButton variant="primary" onClick={handleSave} disabled={isUploadingAvatar}>{isUploadingAvatar ? <SpinnerIcon className="h-4 w-4" /> : 'Salvar Dados'}</SlashButton>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4 font-mono text-sm text-slate-400">
                                    <div className="flex justify-between border-b border-white/5 pb-2"><span>Email:</span><span className="text-white">{user?.email}</span></div>
                                    <div className="flex justify-between border-b border-white/5 pb-2"><span>ID:</span><span className="text-slate-600 text-xs">{user?.id}</span></div>
                                </div>
                            )}
                        </div>
                    </SlashContainer>
                </div>

                <div className="lg:col-span-7 space-y-8">
                    <SlashContainer>
                        <h3 className="text-lg font-bold text-slate-200 uppercase italic mb-6 border-b border-white/10 pb-2">Personalização de Interface</h3>
                        <div className="mb-8">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Atmosfera</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {PRESET_THEMES.map(preset => (
                                    <button key={preset.id} onClick={() => applyThemePreset(preset.id)} className={`relative h-16 group overflow-hidden border transition-all duration-300 ${theme === preset.id ? 'border-red-500 bg-white/5' : 'border-slate-800 bg-black hover:border-slate-600'}`}>
                                        <div className="absolute inset-0 flex items-center justify-center z-10"><span className={`text-xs font-bold uppercase tracking-wider ${theme === preset.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{preset.label}</span></div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-current opacity-20 transform skew-x-12 translate-y-4 translate-x-2" style={{ color: preset.accent }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {/* Font Selection */}
                        <div className="mb-8">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Estilo de Fonte</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <button 
                                    onClick={() => setFontProfile('standard')} 
                                    className={`px-4 py-3 border rounded text-xs font-bold uppercase transition-all ${fontProfile === 'standard' ? 'border-red-500 bg-white/5 text-white' : 'border-slate-800 bg-black text-slate-500 hover:border-slate-600'}`}
                                >
                                    Padrão
                                </button>
                                <button 
                                    onClick={() => setFontProfile('gothic')} 
                                    className={`px-4 py-3 border rounded text-xs font-bold uppercase transition-all ${fontProfile === 'gothic' ? 'border-red-500 bg-white/5 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'border-slate-800 bg-black text-slate-500 hover:border-slate-600'}`}
                                    style={{ fontFamily: "'Cinzel Decorative', serif", letterSpacing: '0.05em' }}
                                >
                                    Legado Sombrio
                                </button>
                                <button 
                                    onClick={() => setFontProfile('confidential')} 
                                    className={`px-4 py-3 border rounded text-xs font-bold uppercase transition-all ${fontProfile === 'confidential' ? 'border-red-500 bg-white/5 text-white' : 'border-slate-800 bg-black text-slate-500 hover:border-slate-600'}`}
                                    style={{ fontFamily: "'Special Elite', monospace" }}
                                >
                                    Arquivo Confidencial
                                </button>
                                <button 
                                    onClick={() => setFontProfile('cosmic')} 
                                    className={`px-4 py-3 border rounded text-xs font-bold uppercase transition-all ${fontProfile === 'cosmic' ? 'border-red-500 bg-white/5 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-slate-800 bg-black text-slate-500 hover:border-slate-600'}`}
                                    style={{ fontFamily: "'Nosifer', cursive" }}
                                >
                                    Terror Cósmico
                                </button>
                                <button 
                                    onClick={() => setFontProfile('executive')} 
                                    className={`px-4 py-3 border rounded text-xs font-bold uppercase transition-all ${fontProfile === 'executive' ? 'border-blue-500 bg-blue-900/20 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-slate-800 bg-black text-slate-500 hover:border-slate-600'}`}
                                    style={{ fontFamily: "'Outfit', sans-serif" }}
                                >
                                    Executivo Prime
                                </button>
                            </div>
                        </div>

                        <div className="mb-8">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Cor de Destaque</p>
                            <div className="flex flex-wrap gap-2">
                                {['#dc2626', '#4ade80', '#2563eb', '#d946ef', '#eab308', '#ffffff'].map(color => (
                                    <button key={color} onClick={() => setAccentColor(color)} className={`w-8 h-8 transform -skew-x-12 border transition-all hover:scale-110 ${accentColor === color ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ backgroundColor: color }} />
                                ))}
                                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-8 h-8 bg-transparent border-0 cursor-pointer opacity-0 absolute" />
                            </div>
                        </div>
                        <div className="p-4 bg-black border border-white/10 relative overflow-hidden group">
                            <div className="flex flex-col sm:flex-row gap-6 items-center relative z-10">
                                <div className="w-full sm:w-1/3 h-24 bg-slate-900 border border-slate-700 relative overflow-hidden">
                                    {wallpaper ? <img src={wallpaper} className="w-full h-full object-cover opacity-50" alt="" /> : <div className="flex items-center justify-center h-full text-[10px] text-slate-600 uppercase">Padrão</div>}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <p className="text-xs font-bold text-slate-300 uppercase">Wallpaper Personalizado</p>
                                    <div className="flex gap-2">
                                        <label className="cursor-pointer px-4 py-2 bg-slate-800 border border-slate-600 text-xs font-bold text-white hover:bg-slate-700 hover:border-slate-500 uppercase transition-colors">
                                            {isUploadingWallpaper ? 'Carregando...' : 'Upload Imagem'}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleWallpaperChange} disabled={isUploadingWallpaper} />
                                        </label>
                                        {wallpaper && <button onClick={removeWallpaper} className="px-4 py-2 bg-transparent border border-red-900 text-xs font-bold text-red-500 hover:bg-red-900/20 uppercase transition-colors">Remover</button>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SlashContainer>

                    <SlashContainer>
                        <h3 className="text-lg font-bold text-slate-200 uppercase italic mb-6 border-b border-white/10 pb-2">Configurações de Sistema</h3>
                        <div className="space-y-4">
                            {wallpaper && (
                                <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 hover:border-red-500/30 transition-colors cursor-pointer" onClick={() => setEnableWallpaperMask(!enableWallpaperMask)}>
                                    <span className="text-xs font-bold text-slate-400 uppercase">Máscara de Contraste</span>
                                    <div className={`w-3 h-3 border ${enableWallpaperMask ? 'bg-red-500 border-red-500 shadow-[0_0_8px_red]' : 'bg-transparent border-slate-600'}`} />
                                </div>
                            )}
                            <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 hover:border-red-500/30 transition-colors cursor-pointer" onClick={() => setEnableFocusMode(!enableFocusMode)}>
                                <div className="flex flex-col"><span className="text-xs font-bold text-slate-400 uppercase">Modo Foco Automático</span><span className="text-[10px] text-slate-600">Desativa visual durante missões</span></div>
                                <div className={`w-3 h-3 border ${enableFocusMode ? 'bg-red-500 border-red-500 shadow-[0_0_8px_red]' : 'bg-transparent border-slate-600'}`} />
                            </div>
                        </div>
                    </SlashContainer>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// 🏢 ENTERPRISE UI COMPONENTS (Teachers, Directors, Staff)
// =============================================================================

const EnterpriseCard: React.FC<{ title?: string, children: React.ReactNode, className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
        {title && (
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wide">{title}</h3>
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

const EnterpriseInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="space-y-1.5 mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <input 
            {...props}
            className="block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white sm:text-sm px-3 py-2"
        />
    </div>
);

const EnterpriseProfileView: React.FC<ProfileViewProps> = (props) => {
    const { 
        theme, applyThemePreset, enableWallpaperMask, setEnableWallpaperMask, 
        accentColor, setAccentColor
    } = useSettings();
    const { 
        user, isEditing, setIsEditing, name, setName, avatarUrl, setAvatarUrl, 
        handleSave, handleAvatarFileChange, isUploadingAvatar,
        wallpaper, handleWallpaperChange, removeWallpaper, isUploadingWallpaper
    } = props;
    const [avatarMode, setAvatarMode] = useState<'upload' | 'url'>('upload');

    // Mapeia role para nome legível
    const roleLabel = {
        'professor': 'Docente',
        'direcao': 'Direção Escolar',
        'secretaria': 'Secretaria Municipal',
        'secretaria_estadual': 'Secretaria Estadual',
        'responsavel': 'Responsável / Tutor'
    }[props.userRole || ''] || 'Colaborador';

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans animate-fade-in">
            {/* Header Corporativo */}
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Meu Perfil</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie suas informações de conta e preferências do sistema.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Coluna Esquerda: Identidade */}
                <div className="space-y-6">
                    <EnterpriseCard>
                        <div className="flex flex-col items-center text-center">
                            <div className="relative group mb-4">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-lg bg-slate-100 dark:bg-slate-600">
                                    {(isEditing ? avatarUrl : user?.avatarUrl) ? (
                                        <img src={isEditing ? avatarUrl : user?.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-4xl font-bold">
                                            {user?.name?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center" title="Ativo">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 mt-2">
                                {roleLabel}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono">{user?.id}</p>
                        </div>

                        <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                            {!isEditing ? (
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-xs font-semibold text-slate-500 uppercase">Email</span>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{user?.email}</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="w-full mt-4 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2 px-4 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Editar Informações
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 mb-4">
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Alterar Foto</label>
                                        <div className="flex gap-2 mb-2">
                                            <button type="button" onClick={() => setAvatarMode('upload')} className={`flex-1 text-xs py-1 rounded ${avatarMode === 'upload' ? 'bg-indigo-100 text-indigo-700' : 'bg-white border'}`}>Upload</button>
                                            <button type="button" onClick={() => setAvatarMode('url')} className={`flex-1 text-xs py-1 rounded ${avatarMode === 'url' ? 'bg-indigo-100 text-indigo-700' : 'bg-white border'}`}>URL</button>
                                        </div>
                                        {avatarMode === 'upload' ? (
                                            <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700" />
                                        ) : (
                                            <input type="text" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full text-xs border rounded p-1" />
                                        )}
                                    </div>
                                    <EnterpriseInput label="Nome Completo" value={name} onChange={e => setName(e.target.value)} />
                                    
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => setIsEditing(false)} className="flex-1 py-2 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-50">Cancelar</button>
                                        <button onClick={handleSave} disabled={isUploadingAvatar} className="flex-1 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50">
                                            {isUploadingAvatar ? 'Salvando...' : 'Salvar'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </EnterpriseCard>
                </div>

                {/* Coluna Direita: Configurações & Sistema */}
                <div className="lg:col-span-2 space-y-6">
                    <EnterpriseCard title="Preferências de Interface">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Tema Visual</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {PRESET_THEMES.map(preset => (
                                        <button 
                                            key={preset.id} 
                                            onClick={() => applyThemePreset(preset.id)}
                                            className={`flex items-center justify-center p-2 rounded-md border text-xs font-medium transition-all ${theme === preset.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                        >
                                            <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: preset.accent }}></span>
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Cor de Destaque</h4>
                                <div className="flex flex-wrap gap-2">
                                    {['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#64748b'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setAccentColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform ${accentColor === color ? 'border-slate-400 scale-110' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-4">Plano de Fundo (Wallpaper)</h4>
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-16 bg-slate-100 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                                    {wallpaper ? (
                                        <img src={wallpaper} alt="Wallpaper" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs text-slate-400">Padrão</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <label className="cursor-pointer px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                        {isUploadingWallpaper ? '...' : 'Alterar Imagem'}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleWallpaperChange} disabled={isUploadingWallpaper} />
                                    </label>
                                    {wallpaper && (
                                        <button onClick={removeWallpaper} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm font-medium hover:bg-red-100 transition-colors">
                                            Remover
                                        </button>
                                    )}
                                </div>
                            </div>
                            {wallpaper && (
                                <div className="mt-4 flex items-center">
                                    <input
                                        id="mask-toggle"
                                        type="checkbox"
                                        checked={enableWallpaperMask}
                                        onChange={(e) => setEnableWallpaperMask(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="mask-toggle" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                                        Aplicar máscara de contraste para legibilidade
                                    </label>
                                </div>
                            )}
                        </div>
                    </EnterpriseCard>

                    <EnterpriseCard title="Sobre o Sistema">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Versão</span>
                            <span className="font-mono text-slate-700 dark:text-slate-200">Lumen Enterprise v2.1.0</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-2">
                            <span className="text-slate-500 dark:text-slate-400">Ambiente</span>
                            <span className="font-mono text-green-600 dark:text-green-400">Production (Secure)</span>
                        </div>
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 flex-1 md:flex md:justify-between">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Para suporte técnico ou dúvidas sobre funcionalidades, contate a administração central.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </EnterpriseCard>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// MAIN CONTROLLER
// =============================================================================

const Profile: React.FC = () => {
    const { user, userRole, updateUser } = useAuth();
    const { updateWallpaper, removeWallpaper, wallpaper: contextWallpaper } = useSettings();
    const { addToast } = useToast();
    
    // Shared State
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [series, setSeries] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);
    const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);

    // Sync user data on load
    useEffect(() => {
        if (user) {
            setName(user.name);
            setSeries(user.series || '');
            setAvatarUrl(user.avatarUrl || '');
        }
    }, [user]);

    // Avatar Upload Logic
    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && user) {
            setIsUploadingAvatar(true);
            try {
                const file = e.target.files[0];
                const filePath = `avatars/${user.id}/${Date.now()}-${file.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                setAvatarUrl(url); // Update local state
                
                // If in enterprise mode, we might want to auto-save or wait for "Save" button.
                // Current logic allows saving url in state, then handleSave commits to Firestore.
            } catch (error) {
                console.error("Avatar upload failed:", error);
                addToast("Erro no upload da imagem.", "error");
            } finally {
                setIsUploadingAvatar(false);
            }
        }
    };

    // Wallpaper Logic
    const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploadingWallpaper(true);
            try {
                const compressed = await compressImage(e.target.files[0]);
                await updateWallpaper(compressed);
                setWallpaperUrl(URL.createObjectURL(compressed));
                addToast("Ambiente reconfigurado!", "success");
            } catch (error) {
                addToast("Erro na imagem.", "error");
            } finally {
                setIsUploadingWallpaper(false);
            }
        }
    };

    const handleRemoveWallpaper = async () => {
        await removeWallpaper();
        setWallpaperUrl(null);
    };

    const handleSave = async () => {
        if (!user) return;
        try {
            await updateUser({ ...user, name, series, avatarUrl });
            setIsEditing(false);
            addToast("Dados salvos com sucesso!", "success");
        } catch (error) {
            console.error(error);
            addToast("Falha ao salvar.", "error");
        }
    };

    const sharedProps: ProfileViewProps = {
        user,
        userRole,
        isEditing,
        setIsEditing,
        name, setName,
        series, setSeries,
        avatarUrl, setAvatarUrl,
        handleSave,
        handleAvatarFileChange,
        isUploadingAvatar,
        handleWallpaperChange,
        isUploadingWallpaper,
        wallpaper: wallpaperUrl || contextWallpaper,
        removeWallpaper: handleRemoveWallpaper
    };

    // ROUTING LOGIC
    if (userRole === 'aluno' || userRole === 'admin') {
        return <GamifiedProfileView {...sharedProps} />;
    }

    return <EnterpriseProfileView {...sharedProps} />;
};

export default Profile;
