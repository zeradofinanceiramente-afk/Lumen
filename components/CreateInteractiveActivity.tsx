
import React, { useState } from 'react';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useTeacherClassContext } from '../contexts/TeacherClassContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { InputField, SelectField } from './common/FormHelpers';
import type { Activity, ActivityType, HotspotItem, ConnectionPair } from '../types';
import { storage } from './firebaseStorage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Activity Archetypes for Selection
const ARCHETYPES = [
    {
        id: 'VisualSourceAnalysis',
        title: 'Análise de Fonte Visual',
        description: 'Upload de imagem histórica. O aluno clica em áreas (hotspots) para descobrir informações.',
        icon: '🔍'
    },
    {
        id: 'ConceptConnection',
        title: 'Conexão de Conceitos',
        description: 'O aluno liga colunas de conceitos relacionados (Ex: Data -> Evento).',
        icon: '🔗'
    },
    {
        id: 'AdvanceOrganizer',
        title: 'Organizador Prévio',
        description: 'Apresenta uma analogia ou vídeo antes do conteúdo para criar "pontes cognitivas".',
        icon: '🌉'
    },
    // Future types placeholders (Phase 2)
    { id: 'IntegrativeDragDrop', title: 'Reconciliação Integrativa', description: 'Classificar itens em colunas opostas ou interseção.', icon: '⚖️' },
    { id: 'ProgressiveTree', title: 'Árvore Progressiva', description: 'Exploração hierárquica de conceitos.', icon: '🌳' },
    { id: 'RoleplayScenario', title: 'Roleplay com IA', description: 'Simulação de conversa com personagem histórico.', icon: '🤖' }
];

const CreateInteractiveActivity: React.FC = () => {
    const { teacherClasses } = useTeacherClassContext();
    const { handleSaveActivity, isSubmittingContent } = useTeacherAcademicContext();
    const { setCurrentPage } = useNavigation();
    const { addToast } = useToast();
    const { user } = useAuth();

    // 1. Selection State
    const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);

    // 2. Common Metadata State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [unidade, setUnidade] = useState('1ª Unidade');
    const [materia, setMateria] = useState('História');
    const [dueDate, setDueDate] = useState('');
    const [points, setPoints] = useState(10);

    // 3. Specific Editors State
    // Visual Source
    const [vsImageFile, setVsImageFile] = useState<File | null>(null);
    const [vsImageUrl, setVsImageUrl] = useState<string | null>(null); // For preview only initially
    const [vsHotspots, setVsHotspots] = useState<HotspotItem[]>([]);
    
    // Concept Connection
    const [ccLeftItems, setCcLeftItems] = useState<{id: string, text: string}[]>([]);
    const [ccRightItems, setCcRightItems] = useState<{id: string, text: string}[]>([]);
    const [ccPairs, setCcPairs] = useState<ConnectionPair[]>([]);

    // Advance Organizer
    const [aoAnalogy, setAoAnalogy] = useState('');
    const [aoConcept, setAoConcept] = useState('');
    const [aoVideoUrl, setAoVideoUrl] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);

    // --- Specific Editor Logic: Visual Source ---
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setVsImageFile(file);
            setVsImageUrl(URL.createObjectURL(file));
        }
    };

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (!vsImageUrl) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        const newHotspot: HotspotItem = {
            id: Date.now().toString(),
            x, y,
            label: 'Novo Detalhe',
            feedback: 'Descrição do detalhe...'
        };
        setVsHotspots([...vsHotspots, newHotspot]);
    };

    const updateHotspot = (id: string, field: keyof HotspotItem, val: string) => {
        setVsHotspots(prev => prev.map(h => h.id === id ? { ...h, [field]: val } : h));
    };

    const removeHotspot = (id: string) => {
        setVsHotspots(prev => prev.filter(h => h.id !== id));
    };

    // --- Specific Editor Logic: Concept Connection ---
    const addConceptPair = () => {
        const id = Date.now().toString();
        const leftId = `left_${id}`;
        const rightId = `right_${id}`;
        
        setCcLeftItems(prev => [...prev, { id: leftId, text: '' }]);
        setCcRightItems(prev => [...prev, { id: rightId, text: '' }]);
        setCcPairs(prev => [...prev, { id, left: leftId, right: rightId }]);
    };

    const updateConceptText = (side: 'left' | 'right', id: string, text: string) => {
        if (side === 'left') {
            setCcLeftItems(prev => prev.map(i => i.id === id ? { ...i, text } : i));
        } else {
            setCcRightItems(prev => prev.map(i => i.id === id ? { ...i, text } : i));
        }
    };

    // --- Save Handler ---
    const handleSave = async (isDraft: boolean) => {
        if (!user || !selectedArchetype) return;
        if (!title.trim() || !description.trim()) {
            addToast("Título e descrição são obrigatórios.", "error");
            return;
        }

        setIsProcessing(true);
        try {
            const activityPayload: any = {
                title, description, 
                type: selectedArchetype as ActivityType,
                points,
                creatorId: user.id, creatorName: user.name,
                unidade, materia, isVisible: true, allowLateSubmissions: true,
                classId: selectedClassId || null,
                className: selectedClassId ? teacherClasses.find(c => c.id === selectedClassId)?.name : '',
                dueDate: dueDate || undefined
            };

            // Build Specific Payload based on Type
            if (selectedArchetype === 'VisualSourceAnalysis') {
                if (!vsImageFile && !vsImageUrl) throw new Error("Selecione uma imagem.");
                if (vsHotspots.length === 0) throw new Error("Adicione pelo menos um hotspot.");

                let finalImageUrl = vsImageUrl;
                if (vsImageFile) {
                    // Upload sem compressão
                    const processedFile = vsImageFile;
                    const storageRef = ref(storage, `activity_assets/${user.id}/${Date.now()}_${processedFile.name}`);
                    await uploadBytes(storageRef, processedFile);
                    finalImageUrl = await getDownloadURL(storageRef);
                }

                activityPayload.visualSourceData = {
                    imageUrl: finalImageUrl,
                    hotspots: vsHotspots
                };
            } 
            else if (selectedArchetype === 'ConceptConnection') {
                if (ccPairs.length < 2) throw new Error("Adicione pelo menos 2 pares de conceitos.");
                activityPayload.conceptConnectionData = {
                    leftColumn: ccLeftItems,
                    rightColumn: ccRightItems,
                    pairs: ccPairs
                };
            }
            else if (selectedArchetype === 'AdvanceOrganizer') {
                if (!aoAnalogy.trim() || !aoConcept.trim()) throw new Error("Preencha a analogia e o conceito.");
                activityPayload.advanceOrganizerData = {
                    analogyText: aoAnalogy,
                    targetConcept: aoConcept,
                    mediaUrl: aoVideoUrl
                };
            }

            await handleSaveActivity(activityPayload, isDraft);
            setCurrentPage('teacher_dashboard');

        } catch (error: any) {
            console.error("Save error:", error);
            addToast(error.message || "Erro ao salvar atividade.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Criar Experiência Interativa</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Aprendizagem Significativa (Ausubel)</p>
                </div>
                <button onClick={() => setCurrentPage('teacher_repository')} className="text-sm text-slate-500 hover:underline">Cancelar</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Archetype Selector */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {ARCHETYPES.map(arch => (
                        <button
                            key={arch.id}
                            onClick={() => setSelectedArchetype(arch.id)}
                            className={`p-4 rounded-xl border text-left transition-all ${
                                selectedArchetype === arch.id 
                                ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-400 dark:ring-indigo-800' 
                                : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-750'
                            }`}
                        >
                            <div className="text-2xl mb-2">{arch.icon}</div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">{arch.title}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{arch.description}</p>
                        </button>
                    ))}
                </div>

                {/* 2. Common Metadata Form (Visible only after selection) */}
                {selectedArchetype && (
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">Informações Básicas</h3>
                            <div className="space-y-4">
                                <InputField label="Título" required>
                                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                </InputField>
                                <InputField label="Instruções" required>
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                </InputField>
                                <InputField label="Turma">
                                    <SelectField value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </SelectField>
                                </InputField>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Pontos">
                                        <input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                    </InputField>
                                    <InputField label="Prazo">
                                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                                    </InputField>
                                </div>
                            </div>
                        </Card>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => handleSave(false)} 
                                disabled={isProcessing || isSubmittingContent}
                                className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg flex justify-center items-center disabled:opacity-50"
                            >
                                {isProcessing ? <SpinnerIcon className="h-5 w-5" /> : 'Publicar Atividade'}
                            </button>
                            <button 
                                onClick={() => handleSave(true)} 
                                disabled={isProcessing}
                                className="w-full py-2 bg-amber-100 text-amber-900 font-semibold rounded-lg hover:bg-amber-200 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                            >
                                Salvar Rascunho
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. Specific Editor (Dynamic) */}
                {selectedArchetype && (
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="min-h-[500px] border-t-4 border-indigo-500">
                            
                            {/* Editor: Visual Source Analysis */}
                            {selectedArchetype === 'VisualSourceAnalysis' && (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg dark:text-white mb-2">Configuração da Fonte Visual</h3>
                                    
                                    {!vsImageUrl ? (
                                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 text-center">
                                            <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" id="img-upload" />
                                            <label htmlFor="img-upload" className="cursor-pointer flex flex-col items-center">
                                                <span className="text-4xl mb-2">🖼️</span>
                                                <span className="text-indigo-600 font-bold hover:underline">Clique para enviar imagem</span>
                                                <span className="text-xs text-slate-500 mt-1">Mapas, pinturas ou fotografias históricas.</span>
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="relative border rounded-lg overflow-hidden group">
                                            <img 
                                                src={vsImageUrl} 
                                                alt="Source" 
                                                onClick={handleImageClick}
                                                className="w-full h-auto cursor-crosshair"
                                            />
                                            {vsHotspots.map((spot, idx) => (
                                                <div 
                                                    key={spot.id}
                                                    className="absolute w-6 h-6 -ml-3 -mt-3 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg"
                                                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                                                >
                                                    {idx + 1}
                                                </div>
                                            ))}
                                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none">
                                                Clique na imagem para adicionar pontos
                                            </div>
                                        </div>
                                    )}

                                    {vsHotspots.length > 0 && (
                                        <div className="mt-4 space-y-3">
                                            <h4 className="font-bold text-sm dark:text-slate-300">Detalhes dos Pontos ({vsHotspots.length})</h4>
                                            {vsHotspots.map((spot, idx) => (
                                                <div key={spot.id} className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg flex gap-3 items-start">
                                                    <div className="w-6 h-6 bg-red-500 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-1">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-grow space-y-2">
                                                        <input 
                                                            type="text" 
                                                            value={spot.label} 
                                                            onChange={e => updateHotspot(spot.id, 'label', e.target.value)}
                                                            className="w-full p-1.5 text-sm border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                            placeholder="Título do detalhe"
                                                        />
                                                        <textarea 
                                                            value={spot.feedback} 
                                                            onChange={e => updateHotspot(spot.id, 'feedback', e.target.value)}
                                                            className="w-full p-1.5 text-sm border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                            placeholder="Explicação pedagógica..."
                                                            rows={2}
                                                        />
                                                    </div>
                                                    <button onClick={() => removeHotspot(spot.id)} className="text-red-500 hover:text-red-700">✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Editor: Concept Connection */}
                            {selectedArchetype === 'ConceptConnection' && (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg dark:text-white mb-2">Pares de Conceitos</h3>
                                    <p className="text-sm text-slate-500">Adicione pares que se relacionam. O sistema embaralhará para o aluno.</p>
                                    
                                    <button onClick={addConceptPair} className="px-4 py-2 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-lg hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300">
                                        + Adicionar Par
                                    </button>

                                    <div className="space-y-2 mt-4">
                                        {ccPairs.map((pair, idx) => {
                                            const leftItem = ccLeftItems.find(i => i.id === pair.left);
                                            const rightItem = ccRightItems.find(i => i.id === pair.right);
                                            return (
                                                <div key={pair.id} className="flex gap-2 items-center">
                                                    <span className="font-mono text-slate-400 text-xs">{idx + 1}.</span>
                                                    <input 
                                                        className="flex-1 p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                        placeholder="Conceito A (ex: 1789)"
                                                        value={leftItem?.text || ''}
                                                        onChange={e => updateConceptText('left', pair.left, e.target.value)}
                                                    />
                                                    <span className="text-slate-400">↔</span>
                                                    <input 
                                                        className="flex-1 p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                                        placeholder="Conceito B (ex: Rev. Francesa)"
                                                        value={rightItem?.text || ''}
                                                        onChange={e => updateConceptText('right', pair.right, e.target.value)}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Editor: Advance Organizer */}
                            {selectedArchetype === 'AdvanceOrganizer' && (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg dark:text-white mb-2">Ponte Cognitiva</h3>
                                    
                                    <InputField label="Texto da Analogia / História Introdutória">
                                        <textarea 
                                            value={aoAnalogy}
                                            onChange={e => setAoAnalogy(e.target.value)}
                                            rows={6}
                                            className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                            placeholder="Ex: Imagine que você é o capitão de um time..."
                                        />
                                    </InputField>

                                    <InputField label="Conceito Alvo (O que será aprendido)">
                                        <input 
                                            type="text" 
                                            value={aoConcept}
                                            onChange={e => setAoConcept(e.target.value)}
                                            className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                            placeholder="Ex: Liderança e Hierarquia Militar"
                                        />
                                    </InputField>

                                    <InputField label="URL do Vídeo (Opcional - YouTube)">
                                        <input 
                                            type="text" 
                                            value={aoVideoUrl}
                                            onChange={e => setAoVideoUrl(e.target.value)}
                                            className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                            placeholder="https://youtube.com/watch?v=..."
                                        />
                                    </InputField>
                                </div>
                            )}

                            {/* Fallback for others */}
                            {!['VisualSourceAnalysis', 'ConceptConnection', 'AdvanceOrganizer'].includes(selectedArchetype) && (
                                <div className="text-center py-20 text-slate-500">
                                    Editor para {selectedArchetype} em desenvolvimento (Fase 2).
                                </div>
                            )}

                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateInteractiveActivity;
