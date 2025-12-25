
import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { useSettings, PRESET_THEMES } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { compressImage } from '../utils/imageCompression';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseStorage';

const schoolYears = [
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)",
];

const Profile: React.FC = () => {
    const { user, userRole, updateUser } = useAuth();
    const { 
        theme, applyThemePreset,
        wallpaper, updateWallpaper, removeWallpaper,
        enableWallpaperMask, setEnableWallpaperMask,
        accentColor, setAccentColor
    } = useSettings();
    const { t } = useLanguage();
    const { addToast } = useToast();
    
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [series, setSeries] = useState(user?.series || '');
    const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);

    // Avatar State
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
    const [avatarMode, setAvatarMode] = useState<'upload' | 'url'>('upload');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    useEffect(() => {
        setName(user?.name || '');
        setSeries(user?.series || '');
        setAvatarUrl(user?.avatarUrl || '');
    }, [user]);

    const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAvatarFile(e.target.files[0]);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        
        let finalAvatarUrl = avatarUrl;

        // Handle Avatar Upload if mode is 'upload' and file selected
        if (avatarMode === 'upload' && avatarFile) {
            setIsUploadingAvatar(true);
            try {
                // Upload raw file without compression as requested
                const fileToUpload = avatarFile;
                const filePath = `avatars/${user.id}/${Date.now()}-${fileToUpload.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, fileToUpload);
                finalAvatarUrl = await getDownloadURL(storageRef);
            } catch (error) {
                console.error("Avatar upload failed:", error);
                addToast("Erro ao fazer upload da foto de perfil.", "error");
                setIsUploadingAvatar(false);
                return; // Stop save on error
            }
            setIsUploadingAvatar(false);
        } else if (avatarMode === 'url') {
            // finalAvatarUrl is already set from input state
        } else {
            // Keep existing URL if no new file and mode is upload but empty
            if (avatarMode === 'upload' && !avatarFile) {
                finalAvatarUrl = user.avatarUrl || '';
            }
        }

        try {
            await updateUser({ ...user, name, series, avatarUrl: finalAvatarUrl });
            setIsEditing(false);
            setAvatarFile(null);
            addToast("Perfil atualizado com sucesso!", "success");
        } catch (error) {
            console.error(error);
            addToast("Erro ao salvar perfil.", "error");
        }
    };

    const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploadingWallpaper(true);
            try {
                const compressed = await compressImage(e.target.files[0]);
                await updateWallpaper(compressed);
                addToast("Papel de parede atualizado!", "success");
            } catch (error) {
                console.error(error);
                addToast("Erro ao salvar imagem.", "error");
            } finally {
                setIsUploadingWallpaper(false);
            }
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6">Configurações & Perfil</h1>

            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-100">{t('profile.personal_info')}</h2>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="text-brand hover:text-white text-sm font-semibold transition-colors">
                            {t('profile.edit')}
                        </button>
                    )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                    
                    {/* Left Column: Avatar & Basic Info */}
                    <div className="space-y-6">
                        <div className="flex flex-col items-center md:items-start gap-4">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-black/40 shadow-lg">
                                    {(isEditing ? (avatarMode === 'url' ? avatarUrl : (avatarFile ? URL.createObjectURL(avatarFile) : user?.avatarUrl)) : user?.avatarUrl) ? (
                                        <img 
                                            src={isEditing ? (avatarMode === 'url' ? avatarUrl : (avatarFile ? URL.createObjectURL(avatarFile) : user?.avatarUrl)) : user?.avatarUrl} 
                                            alt="Avatar" 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-2xl font-bold bg-white/5">
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                {isEditing && isUploadingAvatar && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                                        <SpinnerIcon className="w-6 h-6 text-brand" />
                                    </div>
                                )}
                            </div>

                            {isEditing && (
                                <div className="w-full max-w-xs space-y-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="flex gap-2 mb-2">
                                        <button 
                                            onClick={() => setAvatarMode('upload')}
                                            className={`flex-1 text-xs py-1.5 rounded-lg transition-colors font-semibold ${avatarMode === 'upload' ? 'bg-brand text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                        >
                                            Upload
                                        </button>
                                        <button 
                                            onClick={() => setAvatarMode('url')}
                                            className={`flex-1 text-xs py-1.5 rounded-lg transition-colors font-semibold ${avatarMode === 'url' ? 'bg-brand text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                        >
                                            Link (URL)
                                        </button>
                                    </div>

                                    {avatarMode === 'upload' ? (
                                        <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-brand/50 hover:bg-white/5 transition-colors">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Selecionar Arquivo</span>
                                            <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
                                            {avatarFile && <span className="text-[10px] text-brand mt-1 truncate max-w-[150px]">{avatarFile.name}</span>}
                                        </label>
                                    ) : (
                                        <input 
                                            type="text" 
                                            value={avatarUrl} 
                                            onChange={(e) => setAvatarUrl(e.target.value)} 
                                            placeholder="https://..." 
                                            className="w-full p-2 bg-black/40 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:border-brand outline-none"
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                            {isEditing ? (
                                 <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-2 p-3 bg-black/20 border border-white/10 rounded-lg text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"/>
                            ) : (
                                <p className="text-lg font-medium text-white mt-1">{user?.name}</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Other Info */}
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                            <p className="text-lg font-medium text-white mt-1 opacity-70">{user?.email}</p>
                        </div>
                        {userRole === 'aluno' && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">{t('profile.year')}</label>
                                {isEditing ? (
                                    <select value={series} onChange={e => setSeries(e.target.value)} className="w-full mt-2 p-3 bg-black/20 border border-white/10 rounded-lg text-white focus:border-brand">
                                        {schoolYears.map(year => <option key={year} value={year}>{year}</option>)}
                                    </select>
                                ) : (
                                    <p className="text-lg font-medium text-white mt-1">{user?.series ?? 'Não definido'}</p>
                                )}
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Função</label>
                            <p className="text-lg font-medium text-white mt-1 capitalize">{user?.role}</p>
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/10">
                        <button onClick={() => { setIsEditing(false); setAvatarUrl(user?.avatarUrl || ''); setAvatarFile(null); }} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancelar</button>
                        <button 
                            onClick={handleSave} 
                            disabled={isUploadingAvatar}
                            className="px-6 py-2 bg-brand text-white font-bold rounded-lg shadow-lg hover:shadow-brand/25 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isUploadingAvatar && <SpinnerIcon className="w-4 h-4 text-white" />}
                            Salvar Alterações
                        </button>
                    </div>
                )}
            </Card>

            <Card className="border-l-4 border-brand">
                <h2 className="text-xl font-bold text-slate-100 mb-6">Personalização Visual</h2>
                
                {/* Theme Presets */}
                <div className="mb-8">
                    <div className="flex flex-col mb-4">
                        <p className="text-sm font-bold text-slate-200 uppercase tracking-wider">Atmosfera (Tema)</p>
                        <p className="text-xs text-slate-500">Define o fundo e a barra lateral.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                        {PRESET_THEMES.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => applyThemePreset(preset.id)}
                                className={`relative group rounded-2xl p-4 border transition-all text-left overflow-hidden ${theme === preset.id ? 'border-brand shadow-[0_0_15px_rgba(var(--brand-rgb),0.3)] bg-white/10' : 'border-white/10 hover:border-white/30 bg-black/40'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-8 h-8 rounded-full shadow-inner border border-white/10" 
                                        style={{ background: preset.colors[0] }}
                                    />
                                    <span className={`text-sm font-bold ${theme === preset.id ? 'text-white' : 'text-slate-400'}`}>{preset.label}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Accent Color Picker */}
                <div className="mb-8">
                    <div className="flex flex-col mb-4">
                        <p className="text-sm font-bold text-slate-200 uppercase tracking-wider">Cor de destaque</p>
                        <p className="text-xs text-slate-500">Define a cor dos botões e elementos interativos.</p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        {['#4ade80', '#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#eab308', '#f97316', '#ef4444', '#d946ef', '#ffffff'].map(color => (
                            <button
                                key={color}
                                onClick={() => setAccentColor(color)}
                                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${accentColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                                style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}60` }}
                                aria-label={`Selecionar cor ${color}`}
                            />
                        ))}
                        <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
                        <input 
                            type="color" 
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="bg-transparent border-0 w-8 h-8 cursor-pointer p-0"
                        />
                    </div>
                </div>

                {/* Wallpaper Section */}
                <div className="p-6 bg-black/20 rounded-2xl border border-white/5">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="w-full md:w-64 h-36 rounded-xl border border-white/10 overflow-hidden relative bg-black shadow-lg">
                            {wallpaper ? (
                                <img src={wallpaper} className={`w-full h-full object-cover transition-opacity duration-300 ${enableWallpaperMask ? 'opacity-80' : 'opacity-100'}`} alt="Wallpaper atual" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600 bg-white/5 text-xs text-center p-4">
                                    Usando fundo padrão
                                </div>
                            )}
                            {enableWallpaperMask && wallpaper && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                            )}
                            {isUploadingWallpaper && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                    <SpinnerIcon className="h-6 w-6 text-brand" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-3 items-start flex-1">
                            <h3 className="font-bold text-white">Papel de Parede (Override)</h3>
                            <p className="text-sm text-slate-400 max-w-sm">
                                Você pode sobrepor o fundo do tema com uma imagem personalizada.
                            </p>
                            
                            {wallpaper && (
                                <div className="flex items-center gap-3 bg-black/30 p-2 rounded-lg border border-white/5 w-full max-w-sm">
                                    <input 
                                        type="checkbox" 
                                        id="maskToggle" 
                                        checked={enableWallpaperMask} 
                                        onChange={(e) => setEnableWallpaperMask(e.target.checked)} 
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-brand focus:ring-brand"
                                    />
                                    <label htmlFor="maskToggle" className="text-xs text-slate-300 cursor-pointer select-none">
                                        Aplicar máscara escura (Melhora leitura)
                                    </label>
                                </div>
                            )}

                            <div className="flex gap-3 mt-2">
                                <label className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:brightness-110 transition cursor-pointer flex items-center shadow-lg shadow-brand/20">
                                    <span>Carregar Imagem</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleWallpaperChange} disabled={isUploadingWallpaper} />
                                </label>
                                {wallpaper && (
                                    <button 
                                        onClick={removeWallpaper}
                                        className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-semibold rounded-lg hover:bg-red-500/20 transition"
                                    >
                                        Remover Imagem
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Profile;
