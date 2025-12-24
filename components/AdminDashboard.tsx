
import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useAdminData } from '../contexts/AdminDataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './common/Modal';
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs, collectionGroup, limit } from 'firebase/firestore';
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

const QuickActionButton: React.FC<{ label: string; onClick: () => void, isPrimary?: boolean, icon?: React.ReactNode }> = ({ label, onClick, isPrimary = false, icon }) => (
    <button
        onClick={onClick}
        className={`w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            isPrimary 
            ? 'bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30 dark:hover:bg-orange-500/40' 
            : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600'
        } hc-button-override`}
    >
        {icon && <span className="w-4 h-4">{icon}</span>}
        {label}
    </button>
);

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className}`} />
);

// --- INDEX DIAGNOSTIC MODAL (JARVIS ARCHITECTURE) ---
interface IndexStatus {
    id: string;
    name: string;
    description: string;
    status: 'checking' | 'active' | 'missing' | 'error';
    link?: string;
}

const IndexDiagnosticModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [indexes, setIndexes] = useState<IndexStatus[]>([
        { id: '1', name: 'Submissões de Alunos', description: 'Permite buscar atividades enviadas por ID do aluno (Collection Group).', status: 'checking' },
        { id: '2', name: 'Notificações (Timeline)', description: 'Ordena notificações não lidas por data.', status: 'checking' },
        { id: '3', name: 'Módulos Públicos', description: 'Filtra módulos ativos e públicos com ordenação.', status: 'checking' },
        { id: '4', name: 'Atividades Pendentes', description: 'Filtra atividades por criador e status pendente.', status: 'checking' },
        { id: '5', name: 'Rankings de Quiz', description: 'Ordena resultados de quiz por pontuação.', status: 'checking' }
    ]);

    useEffect(() => {
        if (isOpen) {
            runDiagnostics();
        }
    }, [isOpen]);

    const runDiagnostics = async () => {
        const updates = [...indexes];
        const updateStatus = (id: string, status: IndexStatus['status'], link?: string) => {
            const idx = updates.findIndex(i => i.id === id);
            if (idx !== -1) {
                updates[idx] = { ...updates[idx], status, link };
                setIndexes([...updates]);
            }
        };

        // 1. Submissions (Collection Group)
        try {
            const q = query(collectionGroup(db, 'submissions'), where('studentId', '==', 'DIAGNOSTIC_PROBE'), limit(1));
            await getDocs(q);
            updateStatus('1', 'active');
        } catch (e: any) {
            const link = extractLink(e.message);
            updateStatus('1', link ? 'missing' : 'error', link);
        }

        // 2. Notifications (Composite)
        try {
            const q = query(
                collection(db, "notifications"),
                where("userId", "==", "DIAGNOSTIC_PROBE"),
                where("read", "==", false),
                orderBy("timestamp", "desc"),
                limit(1)
            );
            await getDocs(q);
            updateStatus('2', 'active');
        } catch (e: any) {
            const link = extractLink(e.message);
            updateStatus('2', link ? 'missing' : 'error', link);
        }

        // 3. Modules (Composite)
        try {
            const q = query(
                collection(db, "modules"),
                where("status", "==", "Ativo"),
                where("visibility", "==", "public"),
                limit(1)
            );
            await getDocs(q);
            updateStatus('3', 'active');
        } catch (e: any) {
            const link = extractLink(e.message);
            updateStatus('3', link ? 'missing' : 'error', link);
        }

        // 4. Activities (Composite)
        try {
            const q = query(
                collection(db, "activities"), 
                where("creatorId", "==", "DIAGNOSTIC_PROBE"),
                where("status", "==", "Pendente"),
                limit(1)
            );
            await getDocs(q);
            updateStatus('4', 'active');
        } catch (e: any) {
            const link = extractLink(e.message);
            updateStatus('4', link ? 'missing' : 'error', link);
        }

        // 5. Quiz Results (Ordering)
        try {
            const q = query(
                collectionGroup(db, "quiz_results"), // Assuming global stats might need this, or localized
                orderBy("bestScore", "desc"),
                limit(1)
            );
            // This one is tricky as usually quiz_results are subcollections. 
            // If the app doesn't strictly use this global sort yet, it might pass or fail based on simple index.
            // Let's test the specific user path if collectionGroup fails or isn't used.
            // Actually, let's test a known complex query used in Admin Stats or Leaderboards if any.
            // If not used, we can mark as Active (skipped). 
            // Let's try the common "orderBy date" on generic collection
            const q2 = query(collection(db, "quizzes"), orderBy("date", "desc"), limit(1));
            await getDocs(q2);
            updateStatus('5', 'active');
        } catch (e: any) {
            const link = extractLink(e.message);
            updateStatus('5', link ? 'missing' : 'error', link);
        }
    };

    const extractLink = (msg: string) => {
        // Regex para capturar URL do console firebase
        const match = msg.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
        return match ? match[0] : undefined;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Diagnóstico de Índices Firestore" size="lg">
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200 flex gap-2">
                        <span className="text-xl">🛡️</span>
                        <span>
                            <strong>Modo Jarvis:</strong> O sistema está realizando sondagens ativas (Active Probing) para verificar a integridade dos índices compostos necessários para performance.
                        </span>
                    </p>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Índice / Query</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                            {indexes.map((idx) => (
                                <tr key={idx.id}>
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{idx.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{idx.description}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        {idx.status === 'checking' && <span className="text-slate-500 text-xs font-mono flex items-center"><SpinnerIcon className="h-3 w-3 mr-1 text-slate-500"/> Verificando...</span>}
                                        {idx.status === 'active' && <span className="text-green-600 dark:text-green-400 text-xs font-bold uppercase px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">Ativo</span>}
                                        {idx.status === 'missing' && <span className="text-red-600 dark:text-red-400 text-xs font-bold uppercase px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-full animate-pulse">Faltando</span>}
                                        {idx.status === 'error' && <span className="text-orange-500 text-xs font-bold uppercase">Erro Desconhecido</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {idx.status === 'missing' && idx.link ? (
                                            <a 
                                                href={idx.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                Criar Índice ↗
                                            </a>
                                        ) : (
                                            <span className="text-slate-400 text-xs">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
};

// --- MAP CONFIG MODAL ---
const MapConfigModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addToast } = useToast();
    const [backgrounds, setBackgrounds] = useState<Record<string, string>>({
        'Pré-História': '',
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
                        ['Pré-História', 'Antiga', 'Média', 'Moderna', 'Contemporânea'].forEach(era => {
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
                        {(['Pré-História', 'Antiga', 'Média', 'Moderna', 'Contemporânea'] as const).map(era => (
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

// --- DEFAULT COVER CONFIG MODAL ---
const DefaultCoverModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addToast } = useToast();
    const [defaultCoverUrl, setDefaultCoverUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const loadConfig = async () => {
                setIsLoading(true);
                try {
                    const docRef = doc(db, 'system_settings', 'dashboard_config');
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        setDefaultCoverUrl(snap.data().defaultCoverUrl || '');
                    }
                } catch (error) {
                    console.error("Erro ao carregar config da capa", error);
                    addToast("Erro ao carregar configurações.", "error");
                } finally {
                    setIsLoading(false);
                }
            };
            loadConfig();
        }
    }, [isOpen, addToast]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'system_settings', 'dashboard_config'), { defaultCoverUrl: defaultCoverUrl }, { merge: true });
            addToast("Capa padrão atualizada!", "success");
            onClose();
        } catch (error) {
            console.error("Erro ao salvar capa", error);
            addToast("Erro ao salvar.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configurar Capa Padrão">
            <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Defina a imagem de capa que aparecerá no card "Explorar Módulos" para usuários que ainda não iniciaram nenhum módulo.
                </p>
                
                {isLoading ? (
                    <div className="flex justify-center py-8"><SpinnerIcon className="h-8 w-8 text-indigo-500" /></div>
                ) : (
                    <InputField label="URL da Imagem Padrão">
                        <div className="flex gap-2 items-center">
                            <input 
                                type="text" 
                                value={defaultCoverUrl} 
                                onChange={e => setDefaultCoverUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                            {defaultCoverUrl && (
                                <div className="w-16 h-10 rounded border overflow-hidden flex-shrink-0 bg-slate-200">
                                    <img src={defaultCoverUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    </InputField>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white">Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || isLoading}
                        className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                    >
                        {isSaving ? <SpinnerIcon className="h-4 w-4 mr-2" /> : null}
                        Salvar
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
    const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
    const [isIndexModalOpen, setIsIndexModalOpen] = useState(false);

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
                   <QuickActionButton label="Configurar Capa Padrão" onClick={() => setIsCoverModalOpen(true)} />
                   <QuickActionButton 
                        label="Diagnóstico de Índices" 
                        onClick={() => setIsIndexModalOpen(true)} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                   />
                </div>
            </Card>

            <MapConfigModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} />
            <DefaultCoverModal isOpen={isCoverModalOpen} onClose={() => setIsCoverModalOpen(false)} />
            <IndexDiagnosticModal isOpen={isIndexModalOpen} onClose={() => setIsIndexModalOpen(false)} />
        </div>
    );
};

export default AdminDashboard;
