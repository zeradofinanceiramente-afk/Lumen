
import React, { useMemo, useState } from 'react';
import { Card } from '../common/Card';
import { SpinnerIcon, SCHOOL_YEARS, SUBJECTS_LIST } from '../../constants/index';
import { HistoricalEra, LessonPlan } from '../../types';

// --- Reusable Modern Inputs ---
const ModernInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
        <input 
            {...props}
            className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all text-sm"
        />
    </div>
);

const ModernTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
        <textarea 
            {...props}
            className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all text-sm resize-y min-h-[100px]"
        />
    </div>
);

const ModernSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
        <div className="relative">
            <select 
                {...props}
                className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all text-sm appearance-none"
            >
                {children}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
        </div>
    </div>
);

// --- MOCK DATABASES (Keeping logic intact) ---
const THEMATIC_UNITS_DATABASE: Record<string, Record<string, string[]>> = {
    'História': {
        '6º Ano': ['História: tempo, espaço e registros', 'Mundo clássico vs outras sociedades', 'Organização política', 'Trabalho e sociedade'],
        '7º Ano': ['Mundo moderno e conexões globais', 'Humanismos e Renascimentos', 'Poder colonial', 'Lógicas mercantis'],
        '8º Ano': ['Mundo contemporâneo: crise do Antigo Regime', 'Independências nas Américas', 'Brasil Império', 'Século XIX'],
        '9º Ano': ['República no Brasil', 'Totalitarismos', 'Ditadura e Redemocratização', 'História recente'],
        '1º Ano (Ensino Médio)': ['Sociedade e Cidadania', 'Política e Poder', 'Trabalho', 'Cultura'],
        '2º Ano (Ensino Médio)': ['Território', 'Dinâmicas Econômicas', 'Movimentos Sociais', 'Sustentabilidade'],
        '3º Ano (Ensino Médio)': ['Globalização', 'Ética', 'Memória', 'Projetos de Vida']
    }
};

const BNCC_DATABASE: Record<string, Record<string, { code: string; description: string }[]>> = {
    'História': {
        '6º Ano': [{ code: 'EF06HI01', description: 'Tempo e periodização' }, { code: 'EF06HI02', description: 'Produção do saber histórico' }],
        '7º Ano': [{ code: 'EF07HI01', description: 'Significado de modernidade' }, { code: 'EF07HI04', description: 'População brasileira' }],
        '8º Ano': [{ code: 'EF08HI01', description: 'Iluminismo e liberalismo' }, { code: 'EF08HI03', description: 'Revolução Industrial' }],
        '9º Ano': [{ code: 'EF09HI01', description: 'República no Brasil' }, { code: 'EF09HI02', description: 'Ciclos republicanos' }],
        '1º Ano (Ensino Médio)': [{ code: 'EM13CHS101', description: 'Análise de fontes' }],
    }
};

interface ModuleMetadataFormProps {
    title: string; setTitle: (v: string) => void;
    description: string; setDescription: (v: string) => void;
    coverImageUrl: string; setCoverImageUrl: (v: string) => void;
    videoUrl: string; setVideoUrl: (v: string) => void;
    duration: string; setDuration: (v: string) => void;
    selectedSeries: string[]; setSelectedSeries: (v: string[]) => void;
    selectedSubjects: string[]; setSelectedSubjects: (v: string[]) => void;
    isUploading: boolean; handleCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    availableClasses?: { id: string; name: string }[];
    selectedClassIds: string[]; setSelectedClassIds: (ids: string[]) => void;
    historicalYear: number | undefined; setHistoricalYear: (v: number | undefined) => void;
    historicalEra: HistoricalEra | undefined; setHistoricalEra: (v: HistoricalEra | undefined) => void;
    lessonPlan?: LessonPlan; setLessonPlan?: (lp: LessonPlan) => void;
}

export const ModuleMetadataForm: React.FC<ModuleMetadataFormProps> = ({
    title, setTitle, description, setDescription, coverImageUrl, setCoverImageUrl,
    duration, setDuration,
    selectedSeries, setSelectedSeries, selectedSubjects, setSelectedSubjects,
    isUploading, handleCoverUpload, disabled, availableClasses, selectedClassIds, setSelectedClassIds,
    historicalYear, setHistoricalYear, historicalEra, setHistoricalEra, lessonPlan, setLessonPlan
}) => {
    
    const [activeTab, setActiveTab] = useState<'info' | 'plan'>('info');

    // --- LOGIC HELPERS ---
    
    // Heuristic function to determine era based on year
    const determineEra = (year: number): HistoricalEra => {
        if (year < -4000) return 'Pré-História';
        if (year < 476) return 'Antiga';
        if (year < 1453) return 'Média';
        if (year < 1789) return 'Moderna';
        return 'Contemporânea';
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            setHistoricalYear(undefined);
            return;
        }
        
        const year = Number(val);
        setHistoricalYear(year);
        
        // Auto-select Era
        const autoEra = determineEra(year);
        setHistoricalEra(autoEra);
    };

    const handleToggleClass = (classId: string) => {
        if (selectedClassIds.includes(classId)) setSelectedClassIds(selectedClassIds.filter(id => id !== classId));
        else setSelectedClassIds([...selectedClassIds, classId]);
    };

    const toggleMultiSelect = (setter: (v: string[]) => void, current: string[], value: string) => {
        if (current.includes(value)) setter(current.filter(v => v !== value));
        else setter([...current, value]);
    };

    const updateLessonPlan = (field: keyof LessonPlan, value: string) => {
        if (setLessonPlan && lessonPlan) setLessonPlan({ ...lessonPlan, [field]: value });
    };

    const availableThematicUnits = useMemo(() => {
        const units: string[] = [];
        selectedSubjects.forEach(subject => {
            const subjectData = THEMATIC_UNITS_DATABASE[subject];
            if (subjectData) {
                selectedSeries.forEach(serie => {
                    if (subjectData[serie]) units.push(...subjectData[serie]);
                });
            }
        });
        return [...new Set(units)];
    }, [selectedSubjects, selectedSeries]);

    const toggleThematicUnit = (unit: string) => {
        if (!lessonPlan || !setLessonPlan) return;
        const currentUnits = lessonPlan.thematicUnit ? lessonPlan.thematicUnit.split('; ').filter(Boolean) : [];
        const newUnits = currentUnits.includes(unit) ? currentUnits.filter(u => u !== unit) : [...currentUnits, unit];
        setLessonPlan({ ...lessonPlan, thematicUnit: newUnits.join('; ') });
    };

    return (
        <div className="space-y-6">
            
            {/* Tabs */}
            <div className="flex p-1 bg-[#0d1117] border border-white/10 rounded-xl">
                <button 
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'info' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Metadados
                </button>
                <button 
                    onClick={() => setActiveTab('plan')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'plan' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Plano de Aula
                </button>
            </div>

            {activeTab === 'info' && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* Preview Card (Realistic Dashboard Look) */}
                    <div className="group relative h-48 w-full rounded-3xl overflow-hidden border border-white/10 shadow-lg hover:border-brand/50 transition-all">
                        <div className="absolute inset-0 bg-slate-900">
                            {coverImageUrl ? (
                                <img src={coverImageUrl} className="w-full h-full object-cover opacity-60" alt="Capa" />
                            ) : (
                                <div className="w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 bg-slate-800 flex items-center justify-center">
                                    <span className="text-xs text-slate-500 font-mono">SEM CAPA</span>
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                        
                        {/* Upload Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm z-20">
                            <label className={`cursor-pointer px-4 py-2 bg-brand text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2 ${isUploading ? 'opacity-50' : ''}`}>
                                {isUploading ? <SpinnerIcon className="h-4 w-4 text-black" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                <span>{isUploading ? 'Enviando...' : 'Alterar Capa'}</span>
                                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={disabled || isUploading} />
                            </label>
                        </div>

                        <div className="absolute bottom-0 left-0 p-5 w-full z-10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white leading-tight line-clamp-1">{title || 'Título do Módulo'}</h3>
                                    <p className="text-xs text-slate-300 line-clamp-1 mt-1">{description || 'Descrição breve...'}</p>
                                </div>
                            </div>
                            <div className="mt-3 w-full bg-white/20 rounded-full h-1">
                                <div className="bg-brand h-1 rounded-full w-1/3" />
                            </div>
                        </div>
                    </div>

                    <ModernInput label="Título" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Revolução Industrial" disabled={disabled} />
                    <ModernTextArea label="Descrição" value={description} onChange={e => setDescription(e.target.value)} placeholder="Resumo do conteúdo..." rows={3} disabled={disabled} />

                    <div className="grid grid-cols-1">
                        <ModernInput label="Duração Estimada" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Ex: 2 horas" disabled={disabled} />
                    </div>

                    {/* Timeline */}
                    <div className="bg-[#0d1117]/50 border border-white/5 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-brand uppercase mb-3 flex items-center gap-2">
                            <span className="text-lg">🗺️</span> Mapa do Tempo
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <ModernInput 
                                label="Ano Histórico" 
                                type="number" 
                                value={historicalYear !== undefined ? historicalYear : ''} 
                                onChange={handleYearChange} 
                                placeholder="Ex: 1789" 
                            />
                            <ModernSelect label="Era Histórica" value={historicalEra || ''} onChange={e => setHistoricalEra(e.target.value as HistoricalEra || undefined)}>
                                <option value="">Selecione...</option>
                                <option value="Pré-História">Pré-História</option>
                                <option value="Antiga">Antiga</option>
                                <option value="Média">Média</option>
                                <option value="Moderna">Moderna</option>
                                <option value="Contemporânea">Contemporânea</option>
                            </ModernSelect>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">Matéria</label>
                        <div className="flex flex-wrap gap-2">
                            {SUBJECTS_LIST.map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => toggleMultiSelect(setSelectedSubjects, selectedSubjects, sub)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        selectedSubjects.includes(sub) 
                                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500' 
                                        : 'bg-[#0d1117] text-slate-500 border-slate-700 hover:border-slate-500'
                                    }`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">Séries</label>
                        <div className="flex flex-wrap gap-2">
                            {SCHOOL_YEARS.map(serie => (
                                <button
                                    key={serie}
                                    onClick={() => toggleMultiSelect(setSelectedSeries, selectedSeries, serie)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        selectedSeries.includes(serie) 
                                        ? 'bg-purple-500/20 text-purple-300 border-purple-500' 
                                        : 'bg-[#0d1117] text-slate-500 border-slate-700 hover:border-slate-500'
                                    }`}
                                >
                                    {serie}
                                </button>
                            ))}
                        </div>
                    </div>

                    {availableClasses && availableClasses.length > 0 && (
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">Visibilidade (Turmas)</label>
                            <div className="max-h-40 overflow-y-auto bg-[#0d1117] border border-white/10 rounded-xl p-2 custom-scrollbar">
                                {availableClasses.map(cls => (
                                    <label key={cls.id} className="flex items-center p-2 rounded hover:bg-white/5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedClassIds.includes(cls.id)}
                                            onChange={() => handleToggleClass(cls.id)}
                                            className="rounded border-slate-600 bg-black text-brand focus:ring-brand mr-3"
                                        />
                                        <span className="text-sm text-slate-300">{cls.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'plan' && lessonPlan && setLessonPlan && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-indigo-900/10 border border-indigo-500/30 p-4 rounded-xl">
                        <h4 className="text-indigo-400 font-bold mb-2 flex items-center"><span className="text-xl mr-2">📚</span> Planejamento Pedagógico</h4>
                        <p className="text-xs text-indigo-300/80">Estes dados não são visíveis para os alunos, servindo para documentação docente.</p>
                    </div>

                    <ModernTextArea label="Objetivos de Aprendizagem" value={lessonPlan.objectives} onChange={e => updateLessonPlan('objectives', e.target.value)} placeholder="O que o aluno aprenderá..." rows={3} />
                    
                    <div className="space-y-2">
                        <ModernInput label="Unidades Temáticas (BNCC)" value={lessonPlan.thematicUnit || ''} onChange={e => updateLessonPlan('thematicUnit', e.target.value)} placeholder="Selecione abaixo ou digite..." />
                        {availableThematicUnits.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-2 bg-[#0d1117] rounded-lg border border-white/5">
                                {availableThematicUnits.map((unit, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => toggleThematicUnit(unit)}
                                        className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                                            (lessonPlan.thematicUnit || '').includes(unit) 
                                            ? 'bg-brand/20 text-brand border-brand' 
                                            : 'text-slate-500 border-slate-700 hover:text-slate-300'
                                        }`}
                                    >
                                        {unit}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <ModernTextArea label="Metodologia / Estratégias" value={lessonPlan.methodology} onChange={e => updateLessonPlan('methodology', e.target.value)} rows={3} />
                    <ModernTextArea label="Recursos Didáticos" value={lessonPlan.resources} onChange={e => updateLessonPlan('resources', e.target.value)} rows={2} />
                    <ModernTextArea label="Avaliação" value={lessonPlan.evaluation} onChange={e => updateLessonPlan('evaluation', e.target.value)} rows={2} />
                    <ModernInput label="Códigos BNCC" value={lessonPlan.bncc} onChange={e => updateLessonPlan('bncc', e.target.value)} placeholder="EF08HI01, ..." />
                </div>
            )}
        </div>
    );
};
