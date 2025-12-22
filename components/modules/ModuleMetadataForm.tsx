
import React, { useMemo } from 'react';
import { Card } from '../common/Card';
import { InputField, SelectField, MultiSelect } from '../common/FormHelpers';
import { SpinnerIcon, SCHOOL_YEARS, SUBJECTS_LIST } from '../../constants/index';
import { HistoricalEra, LessonPlan } from '../../types';

// --- MOCK DATABASE UNIDADES TEMÁTICAS ---
const THEMATIC_UNITS_DATABASE: Record<string, Record<string, string[]>> = {
    'História': {
        '6º Ano': [
            'História: tempo, espaço e formas de registros',
            'A invenção do mundo clássico e o contraponto com outras sociedades',
            'Lógicas de organização política',
            'Trabalho e formas de organização social e cultural'
        ],
        '7º Ano': [
            'O mundo moderno e a conexão entre sociedades africanas, americanas e europeias',
            'Humanismos, Renascimentos e o Novo Mundo',
            'A organização do poder e as dinâmicas do mundo colonial americano',
            'Lógicas comerciais e mercantis da modernidade'
        ],
        '8º Ano': [
            'O mundo contemporâneo: o Antigo Regime em crise',
            'Os processos de independência nas Américas',
            'O Brasil no século XIX',
            'Configurações do mundo no século XIX'
        ],
        '9º Ano': [
            'O nascimento da República no Brasil e os processos históricos até a metade do século XX',
            'Totalitarismos e conflitos mundiais',
            'A modernização, a ditadura civil-militar e a redemocratização no Brasil',
            'A história recente'
        ],
        '1º Ano (Ensino Médio)': [
            'Sociedade e Cidadania',
            'Política e Poder',
            'Mundos do Trabalho',
            'Cultura e Identidade'
        ],
        '2º Ano (Ensino Médio)': [
            'Território e Fronteira',
            'Dinâmicas Econômicas',
            'Movimentos Sociais',
            'Natureza e Sustentabilidade'
        ],
        '3º Ano (Ensino Médio)': [
            'Globalização e Tecnologia',
            'Ética e Direitos Humanos',
            'Memória e Patrimônio',
            'Projetos de Vida e Sociedade'
        ]
    }
    // Outras matérias...
};

// --- MOCK DATABASE BNCC ---
// Em uma aplicação real, isso poderia vir de um JSON externo ou API.
// Focado em História para demonstração, com estrutura para expansão.
const BNCC_DATABASE: Record<string, Record<string, { code: string; description: string }[]>> = {
    'História': {
        '6º Ano': [
            { code: 'EF06HI01', description: 'Identificar diferentes formas de compreensão da noção de tempo e de periodização dos processos históricos (continuidades e rupturas).' },
            { code: 'EF06HI02', description: 'Identificar a gênese da produção do saber histórico e analisar o significado das fontes que originaram determinadas formas de registro em sociedades e épocas distintas.' },
            { code: 'EF06HI03', description: 'Identificar as hipóteses científicas sobre o surgimento da espécie humana e sua historicidade e analisar os significados dos mitos de fundação.' },
            { code: 'EF06HI04', description: 'Conhecer as teorias sobre a origem do homem americano.' },
            { code: 'EF06HI05', description: 'Descrever modificações da natureza e da paisagem realizadas por diferentes tipos de sociedade.' },
        ],
        '7º Ano': [
            { code: 'EF07HI01', description: 'Explicar o significado de "modernidade" e suas lógicas de inclusão e exclusão, com base em uma concepção europeia.' },
            { code: 'EF07HI02', description: 'Identificar conexões e interações entre as sociedades do Novo Mundo, da Europa, da África e da Ásia no contexto das navegações.' },
            { code: 'EF07HI03', description: 'Identificar aspectos e processos específicos das sociedades africanas e americanas antes da chegada dos europeus.' },
            { code: 'EF07HI04', description: 'Identificar a distribuição territorial da população brasileira em diferentes épocas.' },
        ],
        '8º Ano': [
            { code: 'EF08HI01', description: 'Identificar os principais aspectos conceituais do iluminismo e do liberalismo e discutir a relação com a organização do mundo contemporâneo.' },
            { code: 'EF08HI02', description: 'Identificar as particularidades político-sociais da Inglaterra do século XVII e analisar os desdobramentos posteriores à Revolução Gloriosa.' },
            { code: 'EF08HI03', description: 'Analisar os impactos da Revolução Industrial na produção e circulação de povos, produtos e culturas.' },
        ],
        '9º Ano': [
            { code: 'EF09HI01', description: 'Descrever e contextualizar os principais aspectos sociais, culturais, econômicos e políticos da emergência da República no Brasil.' },
            { code: 'EF09HI02', description: 'Caracterizar e compreender os ciclos da história republicana, identificando particularidades da história local e regional.' },
            { code: 'EF09HI03', description: 'Identificar os mecanismos de inserção dos negros na sociedade brasileira pós-abolição e avaliar os seus resultados.' },
        ],
        '1º Ano (Ensino Médio)': [
            { code: 'EM13CHS101', description: 'Identificar, analisar e comparar diferentes fontes e narrativas expressas em diversas linguagens, com vistas à compreensão de processos históricos.' },
            { code: 'EM13CHS102', description: 'Identificar, analisar e discutir as circunstâncias históricas, geográficas, políticas, econômicas, sociais, ambientais e culturais da emergência de matrizes conceituais.' },
        ],
        '2º Ano (Ensino Médio)': [
            { code: 'EM13CHS201', description: 'Analisar e caracterizar as dinâmicas das populações, das mercadorias e do capital nos diversos continentes.' },
            { code: 'EM13CHS202', description: 'Analisar e avaliar os impactos das tecnologias na estruturação e nas dinâmicas de grupos, povos e sociedades contemporâneas.' },
        ],
        '3º Ano (Ensino Médio)': [
            { code: 'EM13CHS301', description: 'Problematizar hábitos e práticas individuais e coletivos de produção, reaproveitamento e descarte de resíduos em metrópoles.' },
            { code: 'EM13CHS302', description: 'Analisar e avaliar criticamente os impactos econômicos e socioambientais de cadeias produtivas ligadas à exploração de recursos naturais.' },
        ]
    }
    // Outras matérias podem ser adicionadas aqui
};

interface ModuleMetadataFormProps {
    title: string;
    setTitle: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    coverImageUrl: string;
    setCoverImageUrl: (v: string) => void;
    videoUrl: string;
    setVideoUrl: (v: string) => void;
    difficulty: string;
    setDifficulty: (v: any) => void;
    duration: string;
    setDuration: (v: string) => void;
    selectedSeries: string[];
    setSelectedSeries: (v: string[]) => void;
    selectedSubjects: string[];
    setSelectedSubjects: (v: string[]) => void;
    isUploading: boolean;
    handleCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    // New Props for Class Selection
    availableClasses?: { id: string; name: string }[];
    selectedClassIds: string[];
    setSelectedClassIds: (ids: string[]) => void;
    // Timeline Props
    historicalYear: number | undefined;
    setHistoricalYear: (v: number | undefined) => void;
    historicalEra: HistoricalEra | undefined;
    setHistoricalEra: (v: HistoricalEra | undefined) => void;
    // Lesson Plan Props
    lessonPlan?: LessonPlan;
    setLessonPlan?: (lp: LessonPlan) => void;
}

export const ModuleMetadataForm: React.FC<ModuleMetadataFormProps> = ({
    title, setTitle,
    description, setDescription,
    coverImageUrl, setCoverImageUrl,
    videoUrl, setVideoUrl,
    difficulty, setDifficulty,
    duration, setDuration,
    selectedSeries, setSelectedSeries,
    selectedSubjects, setSelectedSubjects,
    isUploading, handleCoverUpload,
    disabled,
    availableClasses,
    selectedClassIds,
    setSelectedClassIds,
    historicalYear, setHistoricalYear,
    historicalEra, setHistoricalEra,
    lessonPlan, setLessonPlan
}) => {
    
    const handleToggleClass = (classId: string) => {
        if (selectedClassIds.includes(classId)) {
            setSelectedClassIds(selectedClassIds.filter(id => id !== classId));
        } else {
            setSelectedClassIds([...selectedClassIds, classId]);
        }
    };

    const updateLessonPlan = (field: keyof LessonPlan, value: string) => {
        if (setLessonPlan && lessonPlan) {
            setLessonPlan({ ...lessonPlan, [field]: value });
        }
    };

    // --- THEMATIC UNITS LOGIC ---
    const availableThematicUnits = useMemo(() => {
        const units: string[] = [];
        selectedSubjects.forEach(subject => {
            const subjectData = THEMATIC_UNITS_DATABASE[subject];
            if (subjectData) {
                selectedSeries.forEach(serie => {
                    const seriesUnits = subjectData[serie];
                    if (seriesUnits) {
                        units.push(...seriesUnits);
                    }
                });
            }
        });
        // Remove duplicates
        return [...new Set(units)];
    }, [selectedSubjects, selectedSeries]);

    const toggleThematicUnit = (unit: string) => {
        if (!lessonPlan || !setLessonPlan) return;
        
        const currentUnits = lessonPlan.thematicUnit 
            ? lessonPlan.thematicUnit.split('; ').map(s => s.trim()).filter(s => s !== '') 
            : [];
        
        let newUnits: string[];
        if (currentUnits.includes(unit)) {
            newUnits = currentUnits.filter(u => u !== unit);
        } else {
            newUnits = [...currentUnits, unit];
        }
        
        setLessonPlan({ ...lessonPlan, thematicUnit: newUnits.join('; ') });
    };

    const isUnitSelected = (unit: string) => {
        if (!lessonPlan || !lessonPlan.thematicUnit) return false;
        // Use a simple includes check but mindful of partial matches if delimiters are weird, 
        // splitting makes it safer.
        const currentUnits = lessonPlan.thematicUnit.split('; ').map(s => s.trim());
        return currentUnits.includes(unit);
    };

    // --- BNCC LOGIC ---
    const availableBnccSkills = useMemo(() => {
        const skills: { code: string; description: string; subject: string; serie: string }[] = [];
        
        selectedSubjects.forEach(subject => {
            const subjectData = BNCC_DATABASE[subject];
            if (subjectData) {
                selectedSeries.forEach(serie => {
                    const seriesSkills = subjectData[serie];
                    if (seriesSkills) {
                        seriesSkills.forEach(skill => {
                            skills.push({ ...skill, subject, serie });
                        });
                    }
                });
            }
        });
        return skills;
    }, [selectedSubjects, selectedSeries]);

    const toggleBnccCode = (code: string) => {
        if (!lessonPlan || !setLessonPlan) return;
        
        const currentCodes = lessonPlan.bncc 
            ? lessonPlan.bncc.split(',').map(s => s.trim()).filter(s => s !== '') 
            : [];
        
        let newCodes: string[];
        if (currentCodes.includes(code)) {
            newCodes = currentCodes.filter(c => c !== code);
        } else {
            newCodes = [...currentCodes, code];
        }
        
        setLessonPlan({ ...lessonPlan, bncc: newCodes.join(', ') });
    };

    const isCodeSelected = (code: string) => {
        if (!lessonPlan || !lessonPlan.bncc) return false;
        return lessonPlan.bncc.includes(code);
    };
    // ------------------

    // Helper for preview tags
    const displayMateria = selectedSubjects.join(', ');
    const displaySeries = selectedSeries.join(', ');

    const difficultyColors: { [key: string]: string } = {
        'Fácil': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30',
        'Médio': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30',
        'Difícil': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
    };
    const difficultyColor = difficultyColors[difficulty] || '';

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Card className="h-fit">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 border-b dark:border-slate-700 pb-4 mb-6">Informações do Módulo</h3>
                    <div className="space-y-6">
                        <InputField label="Título (Tema da Aula)" required>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={disabled} />
                        </InputField>
                        <InputField label="Descrição (Resumo)">
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={disabled} />
                        </InputField>
                        
                        <InputField label="Imagem de Capa">
                            {coverImageUrl && (
                                <div className="mb-3 relative w-32 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center group shadow-sm">
                                    <img 
                                        src={coverImageUrl} 
                                        alt="Miniatura" 
                                        className="h-full w-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-xs text-white font-medium">Capa Atual</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex space-x-2">
                                <input 
                                    type="text" 
                                    value={coverImageUrl} 
                                    onChange={e => setCoverImageUrl(e.target.value)} 
                                    placeholder="URL da imagem (https://...)" 
                                    className="flex-grow p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                                    disabled={disabled}
                                />
                                <label className={`cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center flex-shrink-0 ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {isUploading ? <SpinnerIcon className="h-5 w-5" /> : 'Upload'}
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleCoverUpload}
                                        className="hidden" 
                                        disabled={disabled || isUploading}
                                    />
                                </label>
                            </div>
                        </InputField>
                        
                        {availableClasses && availableClasses.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 hc-text-secondary">
                                    Selecionar turma(s) <span className="text-red-500">*</span>
                                </label>
                                <div className="max-h-48 overflow-y-auto p-3 border border-gray-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {availableClasses.map(cls => (
                                        <label key={cls.id} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-600 rounded transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedClassIds.includes(cls.id)}
                                                onChange={() => handleToggleClass(cls.id)}
                                                disabled={disabled}
                                                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 dark:bg-slate-600 dark:border-slate-500"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-200">{cls.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <MultiSelect 
                                label="Séries" 
                                options={SCHOOL_YEARS} 
                                selected={selectedSeries} 
                                onChange={setSelectedSeries} 
                            />
                            <MultiSelect 
                                label="Matérias" 
                                options={SUBJECTS_LIST} 
                                selected={selectedSubjects} 
                                onChange={setSelectedSubjects} 
                            />
                        </div>

                        {/* Timeline Data */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Linha do Tempo (Mapa Interativo)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Ano Histórico (Opcional)" helperText="Use números negativos para a.C (Ex: -476)">
                                    <input 
                                        type="number" 
                                        value={historicalYear !== undefined ? historicalYear : ''} 
                                        onChange={e => setHistoricalYear(e.target.value === '' ? undefined : Number(e.target.value))} 
                                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        placeholder="Ex: 1500"
                                        disabled={disabled}
                                    />
                                </InputField>
                                <InputField label="Era Histórica (Opcional)">
                                    <SelectField 
                                        value={historicalEra || ''} 
                                        onChange={e => setHistoricalEra(e.target.value as HistoricalEra || undefined)}
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Pré-História">Pré-História</option>
                                        <option value="Antiga">Idade Antiga</option>
                                        <option value="Média">Idade Média</option>
                                        <option value="Moderna">Idade Moderna</option>
                                        <option value="Contemporânea">Idade Contemporânea</option>
                                    </SelectField>
                                </InputField>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Dificuldade" required>
                                    <SelectField value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
                                        <option>Fácil</option>
                                        <option>Médio</option>
                                        <option>Difícil</option>
                                    </SelectField>
                                </InputField>
                                <InputField label="Duração Estimada">
                                    <input type="text" value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={disabled} placeholder="Ex: 2 horas / 3 aulas" />
                                </InputField>
                        </div>
                    </div>
                </Card>

                {lessonPlan && setLessonPlan && (
                    <Card className="h-fit bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800">
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 border-b dark:border-slate-700 pb-4 mb-6 flex items-center">
                            <span className="text-xl mr-2">📝</span> Planejamento Pedagógico (Plano de Aula)
                        </h3>
                        <div className="space-y-6">
                            
                            {/* Thematic Unit Selector (New) */}
                            <div className="space-y-2">
                                <InputField label="Unidade Temática" helperText="Selecione as unidades sugeridas abaixo.">
                                    <input 
                                        type="text" 
                                        value={lessonPlan.thematicUnit || ''} 
                                        onChange={e => updateLessonPlan('thematicUnit', e.target.value)} 
                                        placeholder="Ex: O mundo moderno..."
                                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                                        disabled={disabled} 
                                    />
                                </InputField>

                                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                                        Sugestões ({selectedSubjects.length > 0 ? selectedSubjects.join(', ') : 'Geral'})
                                    </p>
                                    
                                    {availableThematicUnits.length > 0 ? (
                                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {availableThematicUnits.map((unit, idx) => {
                                                const selected = isUnitSelected(unit);
                                                return (
                                                    <button
                                                        key={`${unit}-${idx}`}
                                                        type="button"
                                                        onClick={() => toggleThematicUnit(unit)}
                                                        className={`w-full text-left p-2 rounded-md border text-xs transition-all duration-200 ${
                                                            selected 
                                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-400 dark:text-indigo-300 shadow-sm' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                                                        }`}
                                                    >
                                                        {unit}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">
                                            {selectedSubjects.length === 0 
                                                ? "Selecione matéria e série para ver unidades." 
                                                : "Nenhuma unidade temática encontrada."}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <InputField label="Objetivos de Aprendizagem" helperText="O que o aluno deve ser capaz de fazer ao final?">
                                <textarea 
                                    value={lessonPlan.objectives} 
                                    onChange={e => updateLessonPlan('objectives', e.target.value)} 
                                    rows={4} 
                                    placeholder="Ex: Compreender as causas da Revolução Francesa..."
                                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                                    disabled={disabled} 
                                />
                            </InputField>
                            
                            <InputField label="Metodologia / Estratégias" helperText="Como o conteúdo será abordado?">
                                <textarea 
                                    value={lessonPlan.methodology} 
                                    onChange={e => updateLessonPlan('methodology', e.target.value)} 
                                    rows={3} 
                                    placeholder="Ex: Leitura compartilhada, análise de imagens, debate..."
                                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                                    disabled={disabled} 
                                />
                            </InputField>

                            <InputField label="Recursos Didáticos" helperText="O que será necessário?">
                                <textarea 
                                    value={lessonPlan.resources} 
                                    onChange={e => updateLessonPlan('resources', e.target.value)} 
                                    rows={2} 
                                    placeholder="Ex: Projetor, livro didático, mapas..."
                                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                                    disabled={disabled} 
                                />
                            </InputField>

                            <InputField label="Avaliação" helperText="Como o aprendizado será verificado?">
                                <textarea 
                                    value={lessonPlan.evaluation} 
                                    onChange={e => updateLessonPlan('evaluation', e.target.value)} 
                                    rows={2} 
                                    placeholder="Ex: Participação no debate e resolução do quiz."
                                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                                    disabled={disabled} 
                                />
                            </InputField>

                            <div className="space-y-2">
                                <InputField label="Habilidades BNCC (Códigos)" helperText="Selecione as habilidades sugeridas abaixo para adicionar automaticamente.">
                                    <input 
                                        type="text" 
                                        value={lessonPlan.bncc} 
                                        onChange={e => updateLessonPlan('bncc', e.target.value)} 
                                        placeholder="Códigos separados por vírgula"
                                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                                        disabled={disabled} 
                                    />
                                </InputField>

                                {/* BNCC Selector */}
                                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                                        Sugestões BNCC ({selectedSubjects.length > 0 ? selectedSubjects.join(', ') : 'Geral'})
                                    </p>
                                    
                                    {availableBnccSkills.length > 0 ? (
                                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {availableBnccSkills.map((skill, idx) => {
                                                const selected = isCodeSelected(skill.code);
                                                return (
                                                    <button
                                                        key={`${skill.code}-${idx}`}
                                                        type="button"
                                                        onClick={() => toggleBnccCode(skill.code)}
                                                        className={`w-full text-left p-2 rounded-md border text-xs transition-all duration-200 ${
                                                            selected 
                                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-400 dark:text-indigo-300 shadow-sm' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-bold">{skill.code}</span>
                                                            <span className="text-[10px] opacity-75 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">{skill.serie}</span>
                                                        </div>
                                                        <p className="line-clamp-2 opacity-90">{skill.description}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">
                                            {selectedSubjects.length === 0 
                                                ? "Selecione uma matéria e série para ver sugestões." 
                                                : "Nenhuma habilidade encontrada no banco de dados para a combinação selecionada."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Preview Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Prévia do Card</h3>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 max-w-sm mx-auto xl:mx-0">
                    <div className="relative aspect-video bg-slate-200 dark:bg-slate-700">
                        {coverImageUrl ? (
                            <img 
                                src={coverImageUrl} 
                                alt="Prévia da Capa" 
                                className="w-full h-full object-cover" 
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x225?text=Erro+na+URL'; }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                                <span className="text-sm">Sem imagem</span>
                            </div>
                        )}
                        <div className="absolute top-3 right-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${difficultyColor}`}>{difficulty}</span>
                        </div>
                    </div>

                    <div className="p-5 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 line-clamp-2">{title || 'Título do Módulo'}</h3>
                        
                        <div className="flex items-center flex-wrap gap-2 mt-3 text-xs font-medium">
                            {displaySeries && <span className="px-2 py-1 rounded truncate max-w-[150px] bg-blue-50 text-blue-700 border border-blue-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">{displaySeries}</span>}
                            {displayMateria && <span className="px-2 py-1 rounded truncate max-w-[150px] bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">{displayMateria}</span>}
                        </div>

                        {historicalYear !== undefined && (
                            <div className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                Ano: {historicalYear} ({historicalEra || '?'})
                            </div>
                        )}

                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 flex-grow line-clamp-3">
                            {description || 'A descrição do módulo aparecerá aqui...'}
                        </p>
                        
                        <button className="mt-5 w-full font-bold py-3 px-4 rounded-lg text-white bg-gradient-to-r from-blue-500 to-green-400 shadow-lg pointer-events-none opacity-80 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Iniciar</span>
                        </button>
                    </div>
                </div>
                <p className="text-xs text-center xl:text-left text-slate-400">Esta é apenas uma prévia visual.</p>
            </div>
        </div>
    );
};