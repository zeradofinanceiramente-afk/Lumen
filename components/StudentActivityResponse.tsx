
import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './common/Card';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import type { Activity, ActivityItem, ActivitySubmission } from '../types';
import { SpinnerIcon, ICONS } from '../constants/index';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { useToast } from '../contexts/ToastContext';
import { storage } from './firebaseStorage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../utils/imageCompression';

const StudentActivityResponse: React.FC = () => {
    const { activeActivity, setCurrentPage } = useNavigation();
    const { handleActivitySubmit } = useStudentAcademic();
    const { user } = useAuth();
    const { addToast } = useToast();

    // Local State
    const [activity, setActivity] = useState<Activity | null>(activeActivity);
    const [submission, setSubmission] = useState<ActivitySubmission | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    
    // File Upload State
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Fetch Fresh Data on Mount
    useEffect(() => {
        if (!activeActivity?.id || !user) return;

        // Se já recebemos a submissão via prop (do contexto de lista), usamos ela.
        if (activeActivity.submissions && activeActivity.submissions.length > 0) {
            setSubmission(activeActivity.submissions[0]);
        }

        const fetchFreshData = async () => {
            // Only fetch if online to avoid errors, rely on prop otherwise
            if (!navigator.onLine) {
                return;
            }
            
            setIsLoading(true);
            try {
                // 1. Fetch Activity (if basic data is stale)
                const docRef = doc(db, 'activities', activeActivity.id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const freshData = { id: docSnap.id, ...docSnap.data() } as Activity;
                    setActivity(freshData);
                }

                // 2. Fetch Submission (SUBCOLLECTION READ) - Phase 3 Scalability
                const subRef = doc(db, 'activities', activeActivity.id, 'submissions', user.id);
                const subSnap = await getDoc(subRef);
                
                if (subSnap.exists()) {
                    setSubmission(subSnap.data() as ActivitySubmission);
                }
            } catch (error) {
                console.error("Error fetching activity/submission:", error);
            } finally {
                setIsLoading(false);
            }
        };

        // Fetch fresh if we don't have a submission passed in, or to double check
        if (!activeActivity.submissions || activeActivity.submissions.length === 0) {
            fetchFreshData();
        }
    }, [activeActivity?.id, user, addToast, activeActivity?.submissions]);

    // Derived Data
    const items = useMemo(() => {
        if (!activity) return [];
        // Fallback for legacy questions array if items is missing
        if (activity.items && activity.items.length > 0) return activity.items;
        if (activity.questions && activity.questions.length > 0) {
            return activity.questions.map((q: any) => ({
                id: q.id.toString(),
                type: 'multiple_choice',
                question: q.question,
                options: q.choices,
                points: 1 // Legacy default
            } as ActivityItem));
        }
        return [];
    }, [activity]);

    // Handlers
    const handleAnswerChange = (itemId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [itemId]: value }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setUploadedFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async () => {
        if (!activity || !user) return;
        
        // Validation
        const unanswered = items.some(item => !answers[item.id] || answers[item.id].trim() === '');
        const hasFiles = uploadedFiles.length > 0;
        
        // Se a atividade permite upload, não é obrigatório ter texto se tiver arquivo
        if (activity.allowFileUpload && hasFiles) {
            // Valid
        } else if (items.length > 0 && unanswered) {
            if (!window.confirm("Existem questões em branco. Deseja enviar mesmo assim?")) return;
        } else if (items.length === 0 && !hasFiles && activity.allowFileUpload) {
             addToast("Por favor, anexe um arquivo para enviar.", "error");
             return;
        }

        setIsSubmitting(true);
        try {
            // Handle File Uploads first
            let submittedFilesPayload: { name: string, url: string }[] = [];
            
            if (hasFiles) {
                setIsUploading(true);
                addToast("Enviando arquivos...", "info");
                for (const file of uploadedFiles) {
                    // Compress if image
                    const fileToUpload = await compressImage(file);
                    const storageRef = ref(storage, `student_submissions/${activity.id}/${user.id}/${Date.now()}-${fileToUpload.name}`);
                    await uploadBytes(storageRef, fileToUpload);
                    const url = await getDownloadURL(storageRef);
                    submittedFilesPayload.push({ name: file.name, url });
                }
                setIsUploading(false);
            }

            // Create JSON content including file metadata if needed, usually passed as separate field in mutation
            // We'll augment the context/hook to handle `submittedFiles`
            // For now, let's pass a JSON string that might include file references if the backend expects it in content,
            // OR ideally update `handleActivitySubmit` to accept a files array.
            // Since we can't easily change the context signature without breaking other things, 
            // let's embed file info in the `answers` JSON if it's an "File Upload Activity" or store in dedicated field via hack.
            
            // Actually, we'll update the hook in `useStudentContent` implicitly by passing a structured object if possible?
            // No, `handleActivitySubmit` takes `content: string`. 
            // We will stringify a special object if files are present.
            
            const submissionPayload = {
                answers,
                submittedFiles: submittedFilesPayload
            };

            await handleActivitySubmit(activity.id, JSON.stringify(submissionPayload));
            setCurrentPage('activities');
        } catch (error: any) {
            addToast(`Erro ao enviar: ${error.message}`, "error");
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };

    if (!activeActivity) {
        return (
            <Card>
                <p>Nenhuma atividade selecionada.</p>
                <button onClick={() => setCurrentPage('activities')} className="mt-4 text-indigo-600 underline">
                    Voltar para Atividades
                </button>
            </Card>
        );
    }

    if (isLoading && !activity) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <SpinnerIcon className="h-12 w-12 text-indigo-600" />
                <p className="mt-4 text-slate-500">Carregando atividade...</p>
            </div>
        );
    }

    // Check if submission content is our new structured JSON or legacy
    let parsedContent: any = {};
    let submittedFilesList: {name: string, url: string}[] = [];
    
    if (submission) {
        try {
            const parsed = JSON.parse(submission.content);
            if (parsed.submittedFiles) {
                // New Format
                parsedContent = parsed.answers || {};
                submittedFilesList = parsed.submittedFiles;
            } else {
                // Standard Answer Map
                parsedContent = parsed;
            }
        } catch {
            // Legacy text
        }
    }

    const isLegacySubmission = submission && submission.content && !submission.content.startsWith('{');

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => setCurrentPage('activities')}
                    className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Voltar para Atividades
                </button>
            </div>

            {/* Activity Header Card */}
            <Card className="border-l-4 border-indigo-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{activity?.title}</h1>
                        <div className="flex flex-wrap gap-3 mt-2">
                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded font-medium">
                                {activity?.className || 'Turma'}
                            </span>
                            <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs px-2 py-1 rounded font-medium border border-indigo-100 dark:border-indigo-800">
                                {activity?.points} pontos
                            </span>
                            {activity?.dueDate && (
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded font-medium">
                                    Prazo: {new Date(activity.dueDate).toLocaleDateString('pt-BR')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                    <p className="whitespace-pre-wrap">{activity?.description}</p>
                </div>

                {activity?.imageUrl && (
                    <div className="mt-6">
                        <img src={activity.imageUrl} alt="Referência da atividade" className="rounded-lg max-h-96 object-contain bg-slate-50 dark:bg-slate-900 border dark:border-slate-700" />
                    </div>
                )}
                
                {activity?.attachmentFiles && activity.attachmentFiles.length > 0 && (
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Materiais de Apoio</h4>
                        <ul className="space-y-2">
                            {activity.attachmentFiles.map((file, idx) => (
                                <li key={idx}>
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-indigo-600 hover:underline text-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                        {file.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </Card>

            {/* Submission Status & Feedback (If submitted) */}
            {submission && (
                <div className={`p-6 rounded-xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 ${
                    submission.status === 'Corrigido' 
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' 
                    : 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
                }`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${submission.status === 'Corrigido' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                            {submission.status === 'Corrigido' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                        </div>
                        <div>
                            <h3 className={`text-xl font-bold ${submission.status === 'Corrigido' ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'}`}>
                                {submission.status}
                            </h3>
                            <p className="text-sm opacity-80 text-slate-700 dark:text-slate-300">
                                Enviado em {new Date(submission.submissionDate).toLocaleDateString('pt-BR')} às {new Date(submission.submissionDate).toLocaleTimeString('pt-BR')}
                            </p>
                        </div>
                    </div>
                    {submission.status === 'Corrigido' && (
                        <div className="text-center md:text-right bg-white/50 dark:bg-black/20 p-4 rounded-lg">
                            <p className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1">Nota Obtida</p>
                            <div className="flex items-baseline justify-center md:justify-end">
                                <span className="text-4xl font-extrabold text-emerald-700 dark:text-emerald-400">{submission.grade}</span>
                                <span className="text-lg text-slate-500 ml-1">/ {activity?.points}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Submitted Files (If any) */}
            {submittedFilesList.length > 0 && (
                <Card>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Arquivos Enviados
                    </h3>
                    <ul className="space-y-3">
                        {submittedFilesList.map((file, idx) => (
                            <li key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded border dark:border-slate-700">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-bold">Download</a>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {/* Questions List */}
            <div className="space-y-6">
                {items.map((item, idx) => {
                    // Logic to display answers if submitted
                    let userAnswer = answers[item.id] || '';
                    if (submission) {
                        if (isLegacySubmission) {
                            // Can't map legacy text blob to individual items easily
                        } else {
                            userAnswer = parsedContent[item.id];
                        }
                    }

                    const isGraded = submission?.status === 'Corrigido';
                    let isCorrect: boolean | null = null;
                    if (isGraded && item.type === 'multiple_choice') {
                        isCorrect = userAnswer === item.correctOptionId;
                    }

                    return (
                        <Card key={item.id} className={`border ${isGraded && isCorrect === true ? 'border-emerald-200 dark:border-emerald-900' : isGraded && isCorrect === false ? 'border-red-200 dark:border-red-900' : 'border-transparent'}`}>
                            <div className="flex justify-between items-center mb-4 border-b dark:border-slate-700 pb-4">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">Questão {idx + 1}</span>
                                <div className="flex items-center gap-2">
                                    {isGraded && isCorrect === true && (
                                        <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            Correto
                                        </span>
                                    )}
                                    {isGraded && isCorrect === false && (
                                        <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded dark:bg-red-900/30 dark:text-red-400 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                            Incorreto
                                        </span>
                                    )}
                                    <span className="text-sm font-semibold bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300">{item.points} pontos</span>
                                </div>
                            </div>
                            
                            <p className="font-medium text-slate-800 dark:text-slate-100 mb-6 text-lg leading-relaxed whitespace-pre-wrap">{item.question}</p>
                            
                            {item.type === 'text' ? (
                                submission ? (
                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Sua Resposta:</p>
                                        <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{userAnswer || 'Sem resposta'}</p>
                                    </div>
                                ) : (
                                    <textarea
                                        rows={6}
                                        className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white text-base transition-shadow"
                                        placeholder="Digite sua resposta aqui..."
                                        value={answers[item.id] || ''}
                                        onChange={e => handleAnswerChange(item.id, e.target.value)}
                                    />
                                )
                            ) : (
                                <div className="space-y-3">
                                    {item.options?.map(opt => {
                                        const isSelected = userAnswer === opt.id;
                                        const isThisCorrectOption = isGraded && opt.id === item.correctOptionId;
                                        
                                        let containerClass = `flex items-center p-4 rounded-xl border transition-all duration-200 ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-md dark:bg-indigo-900/20 dark:border-indigo-500' : 'border-slate-200 dark:border-slate-700'}`;
                                        
                                        if (submission) {
                                            // Read-only view styles
                                            if (isGraded) {
                                                if (isSelected && isThisCorrectOption) {
                                                    containerClass = "flex items-center p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20";
                                                } else if (isSelected && !isThisCorrectOption) {
                                                    containerClass = "flex items-center p-4 rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-900/20";
                                                } else if (isThisCorrectOption) {
                                                    containerClass = "flex items-center p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10 opacity-75";
                                                }
                                            }
                                        } else {
                                            // Interactive view styles
                                            containerClass += " cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700";
                                        }

                                        return (
                                            <label key={opt.id} className={containerClass}>
                                                <div className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'}`}>
                                                    {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name={`q-${item.id}`}
                                                    value={opt.id}
                                                    checked={isSelected}
                                                    onChange={() => !submission && handleAnswerChange(item.id, opt.id)}
                                                    disabled={!!submission}
                                                    className="sr-only"
                                                />
                                                <span className={`text-base ${isSelected ? 'text-indigo-900 dark:text-indigo-100 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {opt.text}
                                                    {isGraded && isThisCorrectOption && <span className="ml-2 text-emerald-600 font-bold text-sm">(Correta)</span>}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    );
                })}

                {/* Legacy Fallback */}
                {isLegacySubmission && (
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Sua Resposta</h3>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono">{submission.content}</p>
                        </div>
                    </Card>
                )}
            </div>

            {/* File Upload Section (If allowed and not submitted) */}
            {!submission && activity?.allowFileUpload && (
                <Card className="border-t-4 border-blue-500">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Enviar Arquivo
                    </h3>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Você pode anexar fotos do caderno, documentos ou trabalhos para esta atividade.
                        </p>
                        <input 
                            type="file" 
                            multiple 
                            onChange={handleFileSelect} 
                            className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100
                            dark:file:bg-blue-900/30 dark:file:text-blue-300"
                        />
                        {uploadedFiles.length > 0 && (
                            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300">
                                {uploadedFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                            </ul>
                        )}
                    </div>
                </Card>
            )}

            {/* Feedback Section */}
            {submission?.feedback && (
                <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-xl border-l-4 border-blue-500 shadow-sm animate-fade-in">
                    <h4 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                        Comentário do Professor
                    </h4>
                    <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{submission.feedback}</p>
                </div>
            )}

            {/* Sticky Submit Button (only if not submitted) */}
            {!submission && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t dark:border-slate-700 flex justify-center z-10">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || isUploading}
                        className="w-full max-w-md py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                    >
                        {isSubmitting || isUploading ? <SpinnerIcon className="h-6 w-6" /> : <span className="text-lg">Enviar Atividade</span>}
                    </button>
                </div>
            )}
        </div>
    );
};

export default StudentActivityResponse;
