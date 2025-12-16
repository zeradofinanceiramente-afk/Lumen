
import React from 'react';
import { Card } from '../common/Card';
import { InputField, SelectField, MultiSelect } from '../common/FormHelpers';
import { SpinnerIcon } from '../../constants/index';
import { SCHOOL_YEARS, SUBJECTS_LIST } from '../common/ModuleForm';

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
    setSelectedClassIds
}) => {
    
    const handleToggleClass = (classId: string) => {
        if (selectedClassIds.includes(classId)) {
            setSelectedClassIds(selectedClassIds.filter(id => id !== classId));
        } else {
            setSelectedClassIds([...selectedClassIds, classId]);
        }
    };

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
            <Card className="h-fit">
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 border-b dark:border-slate-700 pb-4 mb-6">Informações do Módulo</h3>
                <div className="space-y-6">
                    <InputField label="Título" required>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={disabled} />
                    </InputField>
                    <InputField label="Descrição">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Dificuldade" required>
                                <SelectField value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
                                    <option>Fácil</option>
                                    <option>Médio</option>
                                    <option>Difícil</option>
                                </SelectField>
                            </InputField>
                            <InputField label="Duração">
                                <input type="text" value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={disabled} />
                            </InputField>
                    </div>
                </div>
            </Card>

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
