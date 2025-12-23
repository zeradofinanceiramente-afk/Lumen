
import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { useSettings, PRESET_THEMES } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { ICONS, SpinnerIcon } from '../constants/index';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import type { GuardianInvitation } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { compressImage } from '../utils/imageCompression';

const schoolYears = [
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)",
];

const Profile: React.FC = () => {
    const { user, userRole, updateUser } = useAuth();
    const { 
        theme, applyThemePreset,
        isHighContrastText, setIsHighContrastText,
        wallpaper, updateWallpaper, removeWallpaper,
        accentColor, setAccentColor
    } = useSettings();
    const { language, setLanguage, t } = useLanguage();
    const { addToast } = useToast();
    
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [series, setSeries] = useState(user?.series || '');
    const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);

    useEffect(() => {
        setName(user?.name || '');
        setSeries(user?.series || '');
    }, [user]);

    const handleSave = () => {
        if (!user) return;
        updateUser({ ...user, name, series });
        setIsEditing(false);
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

            <Card className="border-l-4 border-brand">
                <h2 className="text-xl font-bold text-slate-100 mb-6">Aparência</h2>
                
                {/* Theme Presets */}
                <div className="mb-8">
                    <p className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Temas</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {PRESET_THEMES.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => applyThemePreset(preset.id)}
                                className={`relative group rounded-2xl p-3 border transition-all text-left overflow-hidden ${theme === preset.id ? 'border-brand shadow-[0_0_15px_rgba(var(--brand-rgb),0.3)] bg-white/5' : 'border-white/10 hover:border-white/30 bg-black/20'}`}
                            >
                                <div 
                                    className="w-full h-12 rounded-lg mb-3 shadow-inner" 
                                    style={{ background: `linear-gradient(135deg, ${preset.colors[0]} 0%, ${preset.colors[1]} 100%)` }}
                                />
                                <span className={`text-xs font-bold block text-center ${theme === preset.id ? 'text-white' : 'text-slate-400'}`}>{preset.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Wallpaper Section */}
                <div className="mb-8 p-6 bg-black/20 rounded-2xl border border-white/5">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="w-full md:w-64 h-36 rounded-xl border border-white/10 overflow-hidden relative bg-black shadow-lg">
                            {wallpaper ? (
                                <img src={wallpaper} className="w-full h-full object-cover" alt="Wallpaper atual" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600 bg-white/5 text-xs text-center p-4">
                                    Usando fundo padrão do tema
                                </div>
                            )}
                            {isUploadingWallpaper && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                    <SpinnerIcon className="h-6 w-6 text-brand" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-3 items-start">
                            <h3 className="font-bold text-white">Papel de Parede Personalizado</h3>
                            <p className="text-sm text-slate-400 max-w-sm">
                                Faça upload de uma imagem para substituir o fundo. A imagem será salva apenas neste dispositivo.
                            </p>
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
                                        Remover
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Accent Color Picker */}
                <div>
                    <p className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Cor de Destaque (Neon)</p>
                    <div className="flex flex-wrap gap-3 items-center">
                        {['#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#eab308', '#f97316', '#ef4444', '#d946ef'].map(color => (
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
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-100">{t('profile.personal_info')}</h2>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="text-brand hover:text-white text-sm font-semibold transition-colors">
                            {t('profile.edit')}
                        </button>
                    )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                        {isEditing ? (
                             <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-2 p-3 bg-black/20 border border-white/10 rounded-lg text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"/>
                        ) : (
                            <p className="text-lg font-medium text-white mt-1">{user?.name}</p>
                        )}
                    </div>
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
                </div>

                {isEditing && (
                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/10">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancelar</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-brand text-white font-bold rounded-lg shadow-lg hover:shadow-brand/25 transition-all">Salvar Alterações</button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Profile;
