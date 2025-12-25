
import React, { useState, useMemo, useEffect, Suspense } from 'react';
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

// Lazy Load Complex Activities
const VisualSourceAnalysis = React.lazy(() => import('./activities/VisualSourceAnalysis').then(m => ({ default: m.VisualSourceAnalysis })));
const ConceptConnection = React.lazy(() => import('./activities/ConceptConnection').then(m => ({ default: m.ConceptConnection })));
const AdvanceOrganizer = React.lazy(() => import('./activities/AdvanceOrganizer').then(m => ({ default: m.AdvanceOrganizer })));
const ProgressiveTree = React.lazy(() => import('./activities/ProgressiveTree').then(m => ({ default: m.ProgressiveTree })));
const IntegrativeDragDrop = React.lazy(() => import('./activities/IntegrativeDragDrop').then(m => ({ default: m.IntegrativeDragDrop })));
const RoleplayScenario = React.lazy(() => import('./activities/RoleplayScenario').then(m => ({ default: m.RoleplayScenario })));

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
    
    // Traditional State
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Dynamic Activity State
    const [dynamicData, setDynamicData] = useState<any>(null); // For non-traditional types

    // Fetch Fresh Data on Mount
    useEffect(() => {
        if (!activeActivity?.id || !user) return;

        if (activeActivity.submissions && activeActivity.submissions.length > 0) {
            setSubmission(activeActivity.submissions[0]);
        }

        const fetchFreshData = async () => {
            if (!navigator.onLine) return;
            
            setIsLoading(true);
            try {
                const docRef = doc(db, 'activities', activeActivity.id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const freshData = { id: docSnap.id, ...docSnap.data() } as Activity;
                    setActivity(freshData);
                }

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

        if (!activeActivity.submissions || activeActivity.submissions.length === 0) {
            fetchFreshData();
        }
    }, [activeActivity?.id, user, addToast, activeActivity?.submissions]);

    // Derived Data for Standard Items
    const items = useMemo(() => {
        if (!activity) return [];
        if (activity.items && activity.items.length > 0) return activity.items;
        if (activity.questions && activity.questions.length > 0) {
            return activity.questions.map((q: any) => ({
                id: q.id.toString(),
                type: 'multiple_choice',
                question: q.question,
                options: q.choices,
                points: 1 
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

    // Generic Complete Handler for Special Activities
    const handleDynamicComplete = (data: any) => {
        setDynamicData(data);
        // Auto-submit or enable submit button based on type?
        // For now, update state and allow manual submit to confirm
        addToast("Progresso salvo localmente. Envie para finalizar.", "info");
    };

    const handleSubmit = async () => {
        if (!activity || !user) return;
        
        setIsSubmitting(true);
        try {
            // Handle File Uploads
            let submittedFilesPayload: { name: string, url: string }[] = [];
            
            if (uploadedFiles.length > 0) {
                setIsUploading(true);
                addToast("Enviando arquivos...", "info");
                for (const file of uploadedFiles) {
                    // Upload raw file without compression
                    const fileToUpload = file;
                    const storageRef = ref(storage, `student_submissions/${activity.id}/${user.id}/${Date.now()}-${fileToUpload.name}`);
                    await uploadBytes(storageRef, fileToUpload);
                    const url = await getDownloadURL(storageRef);
                    submittedFilesPayload.push({ name: file.name, url });
                }
                setIsUploading(false);
            }

            const submissionPayload = {
                answers,
                submittedFiles: submittedFilesPayload,
                dynamicData // New field for Ausubel activities
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

    if (!activeActivity) return <Card><p>Nenhuma atividade selecionada.</p></Card>;
    if (isLoading && !activity) return <div className="flex justify-center h-96"><SpinnerIcon className="h-12 w-12 text-indigo-600" /></div>;

    // Check submission state
    const isSubmitted = !!submission;

    // RENDER LOGIC SWITCH
    const renderContent = () => {
        if (!activity) return null;

        // Specialized Ausubel Activities
        switch (activity.type) {
            case 'VisualSourceAnalysis':
                return <VisualSourceAnalysis activity={activity} onComplete={handleDynamicComplete} />;
            case 'ConceptConnection':
                return <ConceptConnection activity={activity} onComplete={handleDynamicComplete} />;
            case 'AdvanceOrganizer':
                return <AdvanceOrganizer activity={activity} onComplete={handleDynamicComplete} />;
            case 'ProgressiveTree':
                return <ProgressiveTree activity={activity} onComplete={handleDynamicComplete} />;
            case 'IntegrativeDragDrop':
                return <IntegrativeDragDrop activity={activity} onComplete={handleDynamicComplete} />;
            case 'RoleplayScenario':
                return <RoleplayScenario activity={activity} onComplete={handleDynamicComplete} />;
            default:
                // Standard Form (Text/Quiz/Upload)
                return (
                    <div className="space-y-6">
                        {items.map((item, idx) => (
                            <Card key={item.id}>
                                <div className="mb-4"><span className="font-bold text-indigo-400">Questão {idx + 1}</span></div>
                                <p className="mb-6 text-slate-200">{item.question}</p>
                                {item.type === 'text' ? (
                                    <textarea
                                        rows={6}
                                        disabled={isSubmitted}
                                        className="w-full p-4 border border-slate-700 rounded-xl bg-slate-900 text-white"
                                        placeholder="Sua resposta..."
                                        value={answers[item.id] || ''}
                                        onChange={e => handleAnswerChange(item.id, e.target.value)}
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {item.options?.map(opt => (
                                            <label key={opt.id} className="flex items-center p-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`q-${item.id}`}
                                                    checked={answers[item.id] === opt.id}
                                                    onChange={() => handleAnswerChange(item.id, opt.id)}
                                                    disabled={isSubmitted}
                                                    className="mr-3"
                                                />
                                                <span className="text-slate-200">{opt.text}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ))}
                        
                        {activity.allowFileUpload && (
                            <Card className="border-t-4 border-blue-500">
                                <h3 className="font-bold text-white mb-4">Enviar Arquivo</h3>
                                <input type="file" multiple onChange={handleFileSelect} disabled={isSubmitted} className="text-slate-300" />
                            </Card>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <button onClick={() => setCurrentPage('activities')} className="text-slate-400 hover:text-white">← Voltar</button>
            </div>

            <Card className="border-l-4 border-brand">
                <h1 className="text-3xl font-bold text-white">{activity?.title}</h1>
                <p className="text-slate-400 mt-2">{activity?.description}</p>
            </Card>

            <Suspense fallback={<div className="text-center py-10"><SpinnerIcon /></div>}>
                {isSubmitted ? (
                    <div className="p-6 bg-emerald-900/20 border border-emerald-800 rounded-xl text-center">
                        <h3 className="text-xl font-bold text-emerald-400">Atividade Enviada!</h3>
                        <p className="text-slate-400">Aguarde a correção do professor.</p>
                        {submission?.feedback && (
                            <div className="mt-4 text-left bg-black/30 p-4 rounded">
                                <p className="font-bold text-white">Feedback:</p>
                                <p className="text-slate-300">{submission.feedback}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    renderContent()
                )}
            </Suspense>

            {!isSubmitted && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur border-t border-white/10 flex justify-center z-10">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || isUploading}
                        className="w-full max-w-md py-4 bg-brand text-black font-bold rounded-xl hover:bg-brand/90 disabled:opacity-50"
                    >
                        {isSubmitting ? <SpinnerIcon /> : 'Enviar Atividade'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default StudentActivityResponse;
