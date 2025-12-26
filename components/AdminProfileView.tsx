import React, { useState, useEffect } from 'react';
import { useSettings, PRESET_THEMES } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useToast } from '../contexts/ToastContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { storage } from './firebaseStorage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../utils/imageCompression';

export const AdminProfileView: React.FC = () => {
    const { user, updateUser } = useAuth();
    const { 
        theme, applyThemePreset, accentColor, setAccentColor, 
        fontProfile, setFontProfile, updateWallpaper, removeWallpaper, 
        wallpaper: contextWallpaper,
        enableWallpaperMask, setEnableWallpaperMask,
        enableFocusMode, setEnableFocusMode
    } = useSettings();
    const { addToast } = useToast();

    // Local State
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setAvatarUrl(user.avatarUrl || '');
        }
    }, [user]);

    const handleSaveProfile = async () => {
        if (!user) return;
        try {
            await updateUser({ name, avatarUrl });
            setIsEditing(false);
            addToast("Dados do operador atualizados!", "success");
        } catch (error) {
            addToast("Falha ao sincronizar dados.", "error");
        }
    };

    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && user) {
            setIsUploadingAvatar(true);
            try {
                const file = e.target.files[0];
                const storageRef = ref(storage, `avatars/admin/${user.id}_${Date.now()}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                setAvatarUrl(url);
                addToast("Avatar carregado no buffer!", "info");
            } catch (error) {
                addToast("Erro no upload del avatar.", "error");
            } finally {
                setIsUploadingAvatar(false);
            }
        }
    };

    const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploadingWallpaper(true);
            try {
                const compressed = await compressImage(e.target.files[0]);
                await updateWallpaper(compressed);
                addToast("Wallpaper do console atualizado!", "success");
            } catch (error) {
                addToast("Erro ao processar imagem de fundo.", "error");
            } finally {
                setIsUploadingWallpaper(false);
            }
        }
    };

    const handleApplyGlobalAccent = async () => {
        setIsGlobalLoading(true);
        try {
            await setDoc(doc(db, 'system_settings', 'theme_config'), {
                accentColor: accentColor
            }, { merge: true });
            addToast("Matriz de cores definida como padrão global!", "success");
        } catch (e) {
            addToast("Erro ao gravar override global.", "error");
        } finally {
            setIsGlobalLoading(false);
        }
    };

    return (
        <div className="min-h-screen animate-fade-in pb-20 font-sans select-none">
            {/* Header Estilo Terminal */}
            <div className="relative mb-12 py-10 border-b border-[#00d2ff]/20 bg-gradient-to-r from-[#00d2ff]/10 to-transparent pl-6">
                <h1 className="text-6xl font-black text-white uppercase italic tracking-tighter dmc-title shadow-cyan-500/50">
                    Console_do_<span className="text-[#00d2ff]">Administrador</span>
                </h1>
                <p className="text-slate-400 font-mono tracking-[0.3em] uppercase text-xs mt-2">
                    Nível de Acesso: SSS // ID: {user?.id}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Coluna 1: Identidade e Dados do Operador */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-black border border-[#00d2ff]/30 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                            <svg className="w-24 h-24 text-[#00d2ff]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        </div>
                        
                        <div className="flex flex-col items-center gap-6 relative z-10">
                            <div className="relative w-32 h-32">
                                <div className="absolute inset-0 bg-[#00d2ff] rotate-45 opacity-20 animate-pulse"></div>
                                <div className="absolute inset-2 border-2 border-[#00d2ff]/40 rotate-45 overflow-hidden bg-black">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="" className="w-full h-full object-cover -rotate-45 scale-150" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center -rotate-45 font-black text-4xl text-[#00d2ff]">A</div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="text-center w-full">
                                {isEditing ? (
                                    <div className="space-y-4 animate-fade-in">
                                        <input 
                                            value={name} 
                                            onChange={e => setName(e.target.value)}
                                            className="w-full bg-black border border-[#00d2ff]/50 p-2 text-white text-center font-mono outline-none focus:border-[#00d2ff]"
                                            placeholder="NOME_CÓDIGO"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleSaveProfile} className="flex-1 py-2 bg-green-600 text-white font-bold text-xs uppercase hover:bg-green-500">Salvar</button>
                                            <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-slate-800 text-white font-bold text-xs uppercase hover:bg-slate-700">X</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-2xl font-bold text-white uppercase font-mono">{name}</h2>
                                        <p className="text-[#00d2ff] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">System_Maintainer</p>
                                        <button onClick={() => setIsEditing(true)} className="mt-4 text-[10px] text-slate-500 hover:text-[#00d2ff] uppercase font-bold tracking-widest">[ Editar_Operador ]</button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-white/10 space-y-4">
                            <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-slate-500">Status_Conexão:</span>
                                <span className="text-green-400 font-bold">ONLINE_ENCRYPTED</span>
                            </div>
                            <label className="flex justify-between items-center text-xs font-mono cursor-pointer group/upload">
                                <span className="text-slate-500 group-hover/upload:text-white transition-colors">Atualizar_Avatar:</span>
                                <span className="text-[#00d2ff] font-bold">{isUploadingAvatar ? '...' : '[ UPLOAD ]'}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarFileChange} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Coluna 2: Overrides de Sistema */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-[#0d1117] border border-white/10 p-8 rounded-none">
                        <h3 className="text-xl font-bold text-white uppercase italic mb-8 border-l-4 border-[#ff0055] pl-4">Interface_Overrides</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Atmosferas */}
                            <div className="space-y-6">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Atmosfera_Padrão</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {PRESET_THEMES.map(preset => (
                                        <button 
                                            key={preset.id} 
                                            onClick={() => applyThemePreset(preset.id)}
                                            className={`h-14 border font-bold text-[10px] uppercase transition-all ${theme === preset.id ? 'bg-[#00d2ff] border-[#00d2ff] text-black shadow-[0_0_15px_#00d2ff]' : 'bg-black border-slate-700 text-slate-500 hover:border-slate-500'}`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="pt-6 border-t border-white/5 space-y-4">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Comportamento_do_Console</p>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" checked={enableWallpaperMask} onChange={e => setEnableWallpaperMask(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black text-[#00d2ff] focus:ring-[#00d2ff]" />
                                            <span className="text-xs font-mono text-slate-500 group-hover:text-white uppercase transition-colors">Máscara_de_Fundo [ACTIVE]</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" checked={enableFocusMode} onChange={e => setEnableFocusMode(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black text-[#00d2ff] focus:ring-[#00d2ff]" />
                                            <span className="text-xs font-mono text-slate-500 group-hover:text-white uppercase transition-colors">Modo_Foco [AUTO]</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Codificação (Fontes) */}
                            <div className="space-y-6">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estilo_de_Codificação (Fontes)</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <button onClick={() => setFontProfile('standard')} className={`p-3 text-left border text-xs font-bold transition-all ${fontProfile === 'standard' ? 'bg-white/10 border-white text-white' : 'bg-black border-slate-800 text-slate-500'}`}>[ Padrão_System ]</button>
                                    <button onClick={() => setFontProfile('executive')} className={`p-3 text-left border text-xs font-bold transition-all ${fontProfile === 'executive' ? 'bg-white/10 border-white text-white' : 'bg-black border-slate-800 text-slate-500'}`}>[ Executiva_Outfit ]</button>
                                    <button onClick={() => setFontProfile('gothic')} className={`p-3 text-left border text-xs font-bold transition-all font-gothic ${fontProfile === 'gothic' ? 'bg-white/10 border-white text-white' : 'bg-black border-slate-800 text-slate-500'}`}>[ Legado_Gótico ]</button>
                                    <button onClick={() => setFontProfile('confidential')} className={`p-3 text-left border text-xs font-bold transition-all font-confidential ${fontProfile === 'confidential' ? 'bg-white/10 border-white text-white' : 'bg-black border-slate-800 text-slate-500'}`}>[ Arquivo_Confidencial ]</button>
                                    <button onClick={() => setFontProfile('cosmic')} className={`p-3 text-left border text-xs font-bold transition-all font-cosmic ${fontProfile === 'cosmic' ? 'bg-white/10 border-white text-white' : 'bg-black border-slate-800 text-slate-500'}`}>[ Terror_Cósmico ]</button>
                                </div>
                            </div>
                        </div>

                        {/* Cores e Background */}
                        <div className="mt-10 pt-10 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Matriz_de_Cores (Accent)</p>
                                <div className="flex flex-wrap gap-4 items-center">
                                    {['#00d2ff', '#ff0055', '#4ade80', '#eab308', '#ffffff'].map(color => (
                                        <button 
                                            key={color} 
                                            onClick={() => setAccentColor(color)}
                                            className={`w-10 h-10 transform -skew-x-12 border-2 transition-all ${accentColor === color ? 'border-white scale-110 shadow-[0_0_15px_currentcolor]' : 'border-transparent opacity-40'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                    <input 
                                        type="color" 
                                        value={accentColor} 
                                        onChange={e => setAccentColor(e.target.value)} 
                                        className="w-10 h-10 bg-transparent border-0 cursor-pointer" 
                                    />
                                </div>
                                <button 
                                    onClick={handleApplyGlobalAccent}
                                    disabled={isGlobalLoading}
                                    className="w-full py-3 bg-[#00d2ff]/10 border border-[#00d2ff]/30 text-[#00d2ff] font-bold text-xs uppercase hover:bg-[#00d2ff]/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {isGlobalLoading ? <SpinnerIcon className="h-4 w-4" /> : null}
                                    Definir como Padrão Global
                                </button>
                            </div>

                            <div className="space-y-6">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Override_Background</p>
                                <div className="flex gap-4 items-center">
                                    <div className="flex-1 h-20 bg-black border border-white/10 rounded overflow-hidden">
                                        {contextWallpaper ? <img src={contextWallpaper} className="w-full h-full object-cover" alt="" /> : <div className="h-full flex items-center justify-center text-slate-800 font-black text-4xl opacity-20">LUMEN</div>}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="cursor-pointer px-4 py-2 bg-slate-800 text-white text-[10px] font-bold uppercase hover:bg-slate-700 transition-colors">
                                            {isUploadingWallpaper ? '...' : 'Upload'}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleWallpaperChange} />
                                        </label>
                                        {contextWallpaper && <button onClick={removeWallpaper} className="px-4 py-2 border border-red-900 text-red-500 text-[10px] font-bold uppercase hover:bg-red-950 transition-colors">Remove</button>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};