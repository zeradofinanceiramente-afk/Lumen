
import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useAdminData } from '../contexts/AdminDataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './common/Modal';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { useToast } from '../contexts/ToastContext';
import { InputField } from './common/FormHelpers';
import type { HistoricalEra } from '../types';

const WelcomeBanner: React.FC = () => {
    const { user } = useAuth();
    return (
        <div className="p-8 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg hc-bg-override hc-border-override">
            <p className="text-lg opacity-90 hc-text-override">Olá, {user?.name || 'Admin'}! Gerencie o conteúdo público da plataforma.</p>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ReactNode; value: string | number; label: string; iconBgColor: string }> = ({ icon, value, label, iconBgColor }) => (
    <Card className="flex items-center p-4">
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
            {icon}
        </div>
        <div className="ml-4">
            <p className="font-bold text-slate-800 dark:text-slate-100 hc-text-primary text-2xl">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">{label}</p>
        </div>
    </Card>
);

const QuickActionButton: React.FC<{ label: string; onClick: () => void, isPrimary?: boolean }> = ({ label, onClick, isPrimary = false }) => (
    <button
        onClick={onClick}
        className={`w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            isPrimary 
            ? 'bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30 dark:hover:bg-orange-500/40' 
            : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600'
        } hc-button-override`}
    >
        {label}
    </button>
);

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className}`} />
);

// --- MAP CONFIG MODAL ---
const MapConfigModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addToast } = useToast();
    const [backgrounds, setBackgrounds] = useState<Record<string, string>>({
        'Antiga': '',
        'Média': '',
        'Moderna': '',
        'Contemporânea': ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const loadConfigs = async () => {
                setIsLoading(true);
                try {
                    const docRef = doc(db, 'system_settings', 'timeline_backgrounds');
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        // Mapeia para formato simples (pega apenas a primeira URL se for array antigo)
                        const data = snap.data();
                        const newBgs: any = {};
                        ['Antiga', 'Média', 'Moderna', 'Contemporânea'].forEach(era => {
                            const val = data[era];
                            newBgs[era] = Array.isArray(val) ? val[0] : (val || '');
                        });
                        setBackgrounds(newBgs);
                    }
                } catch (error) {
                    console.error("Erro ao carregar configs do mapa", error);
                    addToast("Erro ao carregar configurações.", "error");
                } finally {
                    setIsLoading(false);
                }
            };
            loadConfigs();
        }
    }, [isOpen, addToast]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Salva como array de strings para manter compatibilidade com o componente InteractiveMap
            const payload: any = {};
            Object.entries(backgrounds).forEach(([era, url]) => {
                payload[era] = url ? [url] : [];
            });

            await setDoc(doc(db, 'system_settings', 'timeline_backgrounds'), payload);
            addToast("Imagens do mapa atualizadas!", "success");
            onClose();
        } catch (error) {
            console.error("Erro ao salvar mapa", error);
            addToast("Erro ao salvar.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (era: string, value: string) => {
        setBackgrounds(prev => ({ ...prev, [era]: value }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configurar Mapa Interativo">
            <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Defina as URLs das imagens de fundo para cada era histórica do Mapa Interativo.
                </p>
                
                {isLoading ? (
                    <div className="flex justify-center py-8"><SpinnerIcon className="h-8 w-8 text-indigo-500" /></div>
                ) : (
                    <>
                        {(['Antiga', 'Média', 'Moderna', 'Contemporânea'] as const).map(era => (
                            <InputField key={era} label={`Idade ${era} (URL da Imagem)`}>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="text" 
                                        value={backgrounds[era]} 
                                        onChange={e => handleChange(era, e.target.value)}
                                        placeholder="https://..."
                                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                    {backgrounds[era] && (
                                        <div className="w-10 h-10 rounded border overflow-hidden flex-shrink-0 bg-slate-200">
                                            <img src={backgrounds[era]} alt={era} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </InputField>
                        ))}
                    </>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white">Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || isLoading}
                        className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                    >
                        {isSaving ? <SpinnerIcon className="h-4 w-4 mr-2" /> : null}
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const AdminDashboard: React.FC = () => {
    // FIX: Use totalModulesCount from context which is the real server count
    const { totalModulesCount, quizzes, achievements, isLoading } = useAdminData();
    const { setCurrentPage } = useNavigation();
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);

    return (
        <div className="space-y-8">
            <WelcomeBanner />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {isLoading ? (
                    <>
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                    </>
                ) : (
                    <>
                        <StatCard icon={ICONS.modules} value={totalModulesCount} label="Módulos Públicos" iconBgColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" />
                        <StatCard icon={ICONS.quizzes} value={quizzes.length} label="Quizzes Criados" iconBgColor="bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-300" />
                        <StatCard icon={ICONS.achievements} value={achievements.length} label="Conquistas Ativas" iconBgColor="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300" />
                    </>
                )}
            </div>
            
            <Card>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center hc-text-primary">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    Gerenciamento de Conteúdo
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                   <QuickActionButton label="Gerenciar Módulos" onClick={() => setCurrentPage('admin_modules')} />
                   <QuickActionButton label="Gerenciar Quizzes" onClick={() => setCurrentPage('admin_quizzes')} />
                   <QuickActionButton label="Gerenciar Conquistas" onClick={() => setCurrentPage('admin_achievements')} />
                   <QuickActionButton label="Executar Testes" onClick={() => setCurrentPage('admin_tests')} isPrimary />
                   <QuickActionButton label="Configurar Mapa" onClick={() => setIsMapModalOpen(true)} />
                </div>
            </Card>

            <MapConfigModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} />
        </div>
    );
};

export default AdminDashboard;
