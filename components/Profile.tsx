
import React, { useState, useEffect, useMemo } from 'react';
import { useSettings, PRESET_THEMES } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useToast } from '../contexts/ToastContext';
import { compressImage } from '../utils/imageCompression';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseStorage';
import { useStudentGamificationContext } from '../contexts/StudentGamificationContext';

const schoolYears = [
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)",
];

// =============================================================================
// SHARED TYPES & UI COMPONENTS
// =============================================================================

interface ProfileViewProps {
    user: any;
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

const SlashContainer: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
    <div className={`relative group ${className}`}>
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand/50" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand/50" />
        <div className="bg-black/60 backdrop-blur-xl border-l-2 border-r-2 border-white/5 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(var(--brand-rgb),0.06),rgba(0,255,0,0.02),rgba(var(--brand-rgb),0.06))] z-0 pointer-events-none bg-[length:100%_2px,3px_100%] opacity-20" />
            <div className="relative z-10">{children}</div>
        </div>
    </div>
);

const StylishInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="group relative mb-6">
        <label className="block text-[10px] font-bold text-brand uppercase tracking-[0.2em] mb-1 group-focus-within:text-white transition-colors">
            {label}
        </label>
        <input 
            {...props}
            className="w-full bg-transparent border-b border-white/20 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-brand focus:bg-brand/10 transition-all placeholder:text-slate-700"
        />
        <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-brand group-focus-within:w-full transition-all duration-500 ease-out" />
    </div>
);

const StylishSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div className="group relative mb-6">
        <label className="block text-[10px] font-bold text-brand uppercase tracking-[0.2em] mb-1">
            {label}
        </label>
        <select 
            {...props}
            className="w-full bg-black/50 border-b border-white/20 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-brand transition-all appearance-none cursor-pointer"
        >
            {children}
        </select>
        <div className="absolute right-0 top-6 pointer-events-none text-brand text-xs">▼</div>
    </div>
);

const SlashButton: React.FC<{ 
    onClick?: () => void; 
    children: React.ReactNode; 
    variant?: 'primary' | 'secondary' | 'danger'; 
    disabled?: boolean;
}> = ({ onClick, children, variant = 'primary', disabled }) => {
    let colors = "";
    if (variant === 'primary') colors = "bg-brand/20 text-brand border-brand hover:bg-brand hover:text-black";
    if (variant === 'secondary') colors = "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white";

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

// =============================================================================
// 🎮 STUDENT GAMIFIED VIEW
// =============================================================================

const GamifiedProfileView: React.FC<ProfileViewProps> = (props) => {
    const { 
        theme, applyThemePreset, accentColor, setAccentColor,
        fontProfile, setFontProfile,
        enableWallpaperMask, setEnableWallpaperMask,
        enableFocusMode, setEnableFocusMode,
        isHighContrastText, setIsHighContrastText
    } = useSettings();
    
    const { userStats } = useStudentGamificationContext();

    const styleRank = useMemo(() => {
        const level = userStats?.level || 1;
        if (level >= 50) return { label: 'SSS', color: 'text-yellow-400' };
        if (level >= 40) return { label: 'SS', color: 'text-orange-400' };
        if (level >= 30) return { label: 'S', color: 'text-brand' };
        if (level >= 20) return { label: 'A', color: 'text-green-400' };
        if (level >= 10) return { label: 'B', color: 'text-blue-400' };
        return { label: 'D', color: 'text-slate-500' };
    }, [userStats]);

    const { user, isEditing, setIsEditing, name, setName, series, setSeries, avatarUrl, setAvatarUrl, handleSave, handleAvatarFileChange, isUploadingAvatar, handleWallpaperChange, isUploadingWallpaper, wallpaper, removeWallpaper } = props;
    const [avatarMode, setAvatarMode] = useState<'upload' | 'url'>('upload');

    return (
        <div className="min-h-screen animate-fade-in pb-20 font-sans">
            <div className="relative mb-12 py-8 border-b border-white/10">
                <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter opacity-90 relative z-10">
                    Configurar <span className="text-brand">Perfil</span>
                </h1>
                <p className="text-slate-400 font-mono tracking-[0.3em] uppercase text-xs mt-2 relative z-10">
                    Sincronização de Dados Acadêmicos // Aluno
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5 space-y-8">
                    {/* Card de Rank */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-brand to-cyan-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-black border border-white/10 p-6 flex items-center gap-6 overflow-hidden">
                            <div className="relative w-32 h-32 flex-shrink-0">
                                <div className="absolute inset-0 bg-brand rotate-45 opacity-20 animate-pulse"></div>
                                <div className="absolute inset-2 border-2 border-white/20 rotate-45 overflow-hidden bg-black">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover -rotate-45 scale-150" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center -rotate-45 font-black text-4xl text-slate-700">?</div>
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
                                <p className="text-brand text-xs font-mono tracking-widest uppercase mb-4">{user?.series || 'Visitante'}</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] text-slate-400 font-mono uppercase">
                                        <span>XP</span><span>{userStats?.xp}</span>
                                    </div>
                                    <div className="h-1 w-full bg-slate-900 overflow-hidden"><div className="h-full bg-brand w-3/4 shadow-[0_0_10px_var(--brand-color)]"></div></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <SlashContainer>
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                            <h3 className="text-lg font-bold text-slate-200 uppercase italic">Dados do Operador</h3>
                            {!isEditing && <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-brand hover:text-white uppercase tracking-wider">[ Editar ]</button>}
                        </div>
                        <div className="space-y-4">
                            {isEditing ? (
                                <>
                                    <div className="mb-6 p-4 bg-brand/10 border border-brand/30">
                                        <label className="text-[10px] font-bold text-brand uppercase block mb-2">Avatar Source</label>
                                        <div className="flex gap-4 mb-3">
                                            <button onClick={() => setAvatarMode('upload')} className={`text-xs uppercase font-bold px-3 py-1 ${avatarMode === 'upload' ? 'bg-brand text-black' : 'text-slate-500 border border-slate-700'}`}>Upload</button>
                                            <button onClick={() => setAvatarMode('url')} className={`text-xs uppercase font-bold px-3 py-1 ${avatarMode === 'url' ? 'bg-brand text-black' : 'text-slate-500 border border-slate-700'}`}>URL</button>
                                        </div>
                                        {avatarMode === 'upload' ? (
                                            <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="text-xs text-slate-400" />
                                        ) : (
                                            <input type="text" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full bg-black border-b border-slate-700 text-xs p-1 text-white focus:border-brand outline-none" />
                                        )}
                                    </div>
                                    <ModernInput label="Nome de Código" value={name} onChange={e => setName(e.target.value)} />
                                    <ModernSelect label="Nível de Acesso (Série)" value={series} onChange={e => setSeries(e.target.value)}>
                                        {schoolYears.map(year => <option key={year} value={year}>{year}</option>)}
                                    </ModernSelect>
                                    <div className="flex gap-4 mt-8">
                                        <SlashButton variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</SlashButton>
                                        <SlashButton variant="primary" onClick={handleSave} disabled={isUploadingAvatar}>{isUploadingAvatar ? <SpinnerIcon className="h-4 w-4" /> : 'Salvar Dados'}</SlashButton>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4 font-mono text-sm text-slate-400">
                                    <div className="flex justify-between border-b border-white/5 pb-2"><span>Email:</span><span className="text-white">{user?.email}</span></div>
                                    <div className="flex justify-between border-b border-white/5 pb-2"><span>ID_PÚBLICO:</span><span className="text-slate-200 text-[10px]">{user?.id}</span></div>
                                </div>
                            )}
                        </div>
                    </SlashContainer>

                    {/* Wallpaper Section for Student */}
                    <SlashContainer>
                        <h3 className="text-lg font-bold text-slate-200 uppercase italic mb-6 border-b border-white/10 pb-2">Atmosfera Pessoal</h3>
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Papel de Parede do Console</p>
                            <div className="flex gap-4 items-center">
                                <div className="flex-1 h-24 bg-black border border-white/10 rounded-lg overflow-hidden relative">
                                    {wallpaper ? (
                                        <img src={wallpaper} className="w-full h-full object-cover" alt="Wallpaper" />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-800 font-black text-2xl opacity-20">LUMEN</div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="cursor-pointer px-4 py-2 bg-slate-800 text-white text-[10px] font-bold uppercase hover:bg-slate-700 transition-colors rounded">
                                        {isUploadingWallpaper ? '...' : 'UPLOAD'}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleWallpaperChange} />
                                    </label>
                                    {wallpaper && <button onClick={removeWallpaper} className="px-4 py-2 border border-red-900 text-red-500 text-[10px] font-bold uppercase hover:bg-red-950 transition-colors rounded">RESET</button>}
                                </div>
                            </div>
                        </div>
                    </SlashContainer>
                </div>

                <div className="lg:col-span-7 space-y-8">
                    <SlashContainer>
                        <h3 className="text-lg font-bold text-slate-200 uppercase italic mb-6 border-b border-white/10 pb-2">Personalização de Interface</h3>
                        <div className="mb-8">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Atmosfera do Ambiente</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {PRESET_THEMES.map(preset => (
                                    <button 
                                        key={preset.id} 
                                        onClick={() => applyThemePreset(preset.id)} 
                                        className={`relative h-20 group overflow-hidden border transition-all duration-300 ${theme === preset.id ? 'border-brand scale-[1.02] shadow-[0_0_15px_rgba(var(--brand-rgb),0.3)]' : 'border-slate-800 hover:border-slate-600'}`}
                                        style={{
                                            background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})`
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-black opacity-20 group-hover:opacity-0 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                            <span className={`text-xs font-bold uppercase tracking-wider drop-shadow-md text-white`}>{preset.label}</span>
                                        </div>
                                        {/* Accent Preview Dot */}
                                        <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: preset.accent }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="mb-8">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Estilo de Codificação (Fontes)</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {(['standard', 'gothic', 'confidential', 'cosmic', 'executive'] as const).map(f => (
                                    <button key={f} onClick={() => setFontProfile(f)} className={`p-3 border text-xs font-bold uppercase transition-all ${fontProfile === f ? 'border-brand bg-brand/10 text-brand' : 'border-slate-800 bg-black text-slate-500 hover:border-slate-600'}`}>
                                        {f === 'standard' ? 'Padrão' : f === 'gothic' ? 'Legado' : f === 'confidential' ? 'Arquivo' : f === 'cosmic' ? 'Terror' : 'Executivo'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-8">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Matriz de Destaque (Cores)</p>
                            <div className="flex flex-wrap gap-3 items-center">
                                {['#4ade80', '#2563eb', '#d946ef', '#eab308', '#dc2626', '#00d2ff'].map(color => (
                                    <button key={color} onClick={() => setAccentColor(color)} className={`w-8 h-8 transform -skew-x-12 border transition-all ${accentColor === color ? 'border-white scale-110 shadow-[0_0_10px_currentcolor]' : 'border-transparent opacity-50'}`} style={{ backgroundColor: color }} />
                                ))}
                                <div className="h-6 w-px bg-white/10 mx-1"></div>
                                <input 
                                    type="color" 
                                    value={accentColor} 
                                    onChange={e => setAccentColor(e.target.value)} 
                                    className="w-10 h-10 bg-transparent border-0 cursor-pointer p-0" 
                                    title="Cor Personalizada"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Acessibilidade e Foco</p>
                            <div className="flex flex-wrap gap-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={isHighContrastText} 
                                        onChange={e => setIsHighContrastText(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 bg-black text-brand focus:ring-brand"
                                    />
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white uppercase tracking-wider transition-colors">Texto em Alto Contraste (WCAG)</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={enableWallpaperMask} 
                                        onChange={e => setEnableWallpaperMask(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 bg-black text-brand focus:ring-brand"
                                    />
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white uppercase tracking-wider transition-colors">Filtro de Leitura (Máscara)</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={enableFocusMode} 
                                        onChange={e => setEnableFocusMode(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 bg-black text-brand focus:ring-brand"
                                    />
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white uppercase tracking-wider transition-colors">Protocolo de Foco (Imersivo)</span>
                                </label>
                            </div>
                        </div>
                    </SlashContainer>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// 🏢 ENTERPRISE VIEW (Teachers, Directors)
// =============================================================================

const EnterpriseProfileView: React.FC<ProfileViewProps> = (props) => {
    const { 
        theme, applyThemePreset, accentColor, setAccentColor, fontProfile, setFontProfile,
        enableWallpaperMask, setEnableWallpaperMask, enableFocusMode, setEnableFocusMode,
        isHighContrastText, setIsHighContrastText
    } = useSettings();
    const { user, isEditing, setIsEditing, name, setName, avatarUrl, handleSave, handleAvatarFileChange, isUploadingAvatar } = props;

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 font-sans animate-fade-in">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Meu Perfil Corporativo</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 text-center h-fit">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-lg mx-auto mb-4 bg-slate-100 dark:bg-slate-600">
                        {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-indigo-400">P</div>}
                    </div>
                    {isEditing ? (
                        <div className="space-y-4 text-left">
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700" />
                            <input type="file" onChange={handleAvatarFileChange} className="text-xs" />
                            <div className="flex gap-2">
                                <button onClick={handleSave} disabled={isUploadingAvatar} className="flex-1 py-2 bg-brand text-black font-bold rounded">Salvar</button>
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-slate-500 text-white rounded">X</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 mt-2">Docente</span>
                            <button onClick={() => setIsEditing(true)} className="w-full mt-8 py-2 bg-slate-100 dark:bg-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200">Editar Perfil</button>
                        </>
                    )}
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="font-bold text-lg mb-6">Preferências Visuais</h3>
                        <div className="space-y-8">
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase mb-3">Atmosfera</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {PRESET_THEMES.map(p => (
                                        <button 
                                            key={p.id} 
                                            onClick={() => applyThemePreset(p.id)} 
                                            className={`p-3 border rounded text-xs font-bold transition-all relative overflow-hidden ${theme === p.id ? 'border-brand ring-2 ring-brand/20' : 'border-slate-200 dark:border-slate-600'}`}
                                            style={{
                                                background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})`,
                                                color: '#fff',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                                            }}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase mb-3">Estilo de Fonte</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {(['standard', 'executive'] as const).map(f => (
                                        <button key={f} onClick={() => setFontProfile(f)} className={`p-3 border rounded text-xs font-bold ${fontProfile === f ? 'border-brand bg-brand/5' : 'border-slate-200'}`}>
                                            {f === 'standard' ? 'Padrão' : 'Corporativa (Executiva)'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase mb-3">Cores</p>
                                <div className="flex gap-4 items-center">
                                    <input 
                                        type="color" 
                                        value={accentColor} 
                                        onChange={e => setAccentColor(e.target.value)} 
                                        className="w-12 h-12 bg-transparent border-0 cursor-pointer p-0" 
                                    />
                                    <span className="text-sm font-mono">{accentColor}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-sm font-bold text-slate-500 uppercase mb-4">Acessibilidade e Comportamento</p>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={isHighContrastText} onChange={e => setIsHighContrastText(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Modo de Texto em Alto Contraste</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={enableWallpaperMask} onChange={e => setEnableWallpaperMask(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Habilitar máscara de leitura sobre papéis de parede</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={enableFocusMode} onChange={e => setEnableFocusMode(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Modo Foco automático durante atividades</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Reusable Modern Component replacements ---
const ModernInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="group relative mb-6">
        <label className="block text-[10px] font-bold text-brand uppercase tracking-[0.2em] mb-1 group-focus-within:text-white transition-colors">
            {label}
        </label>
        <input 
            {...props}
            className="w-full bg-transparent border-b border-white/20 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-brand focus:bg-brand/10 transition-all placeholder:text-slate-700"
        />
    </div>
);

const ModernSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div className="group relative mb-6">
        <label className="block text-[10px] font-bold text-brand uppercase tracking-[0.2em] mb-1">
            {label}
        </label>
        <select 
            {...props}
            className="w-full bg-black/50 border-b border-white/20 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-brand transition-all appearance-none cursor-pointer"
        >
            {children}
        </select>
    </div>
);

// =============================================================================
// MAIN CONTROLLER
// =============================================================================

const Profile: React.FC = () => {
    const { user, userRole, updateUser } = useAuth();
    const { updateWallpaper, removeWallpaper, wallpaper: contextWallpaper } = useSettings();
    const { addToast } = useToast();
    
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [series, setSeries] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setSeries(user.series || '');
            setAvatarUrl(user.avatarUrl || '');
        }
    }, [user]);

    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && user) {
            setIsUploadingAvatar(true);
            try {
                const storageRef = ref(storage, `avatars/users/${user.id}_${Date.now()}`);
                await uploadBytes(storageRef, e.target.files[0]);
                const url = await getDownloadURL(storageRef);
                setAvatarUrl(url);
            } catch (error) { addToast("Erro no upload.", "error"); } finally { setIsUploadingAvatar(false); }
        }
    };

    const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploadingWallpaper(true);
            try {
                const compressed = await compressImage(e.target.files[0]);
                await updateWallpaper(compressed);
                addToast("Wallpaper atualizado!", "success");
            } catch (error) { addToast("Erro no wallpaper.", "error"); } finally { setIsUploadingWallpaper(false); }
        }
    };

    const handleSave = async () => {
        if (!user) return;
        try {
            await updateUser({ name, series, avatarUrl });
            setIsEditing(false);
            addToast("Dados salvos com sucesso!", "success");
        } catch (error) { addToast("Falha ao salvar.", "error"); }
    };

    const sharedProps: ProfileViewProps = {
        user, isEditing, setIsEditing, name, setName, series, setSeries,
        avatarUrl, setAvatarUrl, handleSave, handleAvatarFileChange, isUploadingAvatar,
        handleWallpaperChange, isUploadingWallpaper, wallpaper: contextWallpaper,
        removeWallpaper
    };

    if (userRole === 'aluno') return <GamifiedProfileView {...sharedProps} />;
    return <EnterpriseProfileView {...sharedProps} />;
};

export default Profile;