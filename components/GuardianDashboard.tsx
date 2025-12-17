
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from './common/Card';
import { SpinnerIcon, ICONS } from '../constants/index';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseClient';
import type { User, StudentGradeSummaryDoc, Unidade, GradeReportSubject } from '../types';
import { createNotification } from '../utils/createNotification';

interface Ward extends User {
    // Basic profile info is inherited from User
}

interface StudentGradeCardProps {
    student: Ward;
}

// Helper to get score color
const getScoreColor = (score: number | undefined | null): string => {
    if (score === undefined || score === null) return 'text-slate-500';
    const val = Number(score.toFixed(1));
    if (val >= 10) return 'text-yellow-600 dark:text-yellow-400';
    if (val >= 7.1) return 'text-emerald-600 dark:text-emerald-400';
    if (val >= 5.0) return 'text-blue-700 dark:text-blue-400';
    return 'text-red-700 dark:text-red-400';
};

const StudentGradeCard: React.FC<StudentGradeCardProps> = ({ student }) => {
    const [grades, setGrades] = useState<StudentGradeSummaryDoc[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const fetchGrades = async () => {
            setIsLoading(true);
            try {
                // Fetch all grade summaries for this student
                const q = query(
                    collection(db, "student_grades"),
                    where("studentId", "==", student.id)
                );
                const snapshot = await getDocs(q);
                const results: StudentGradeSummaryDoc[] = [];
                snapshot.forEach(d => {
                    results.push(d.data() as StudentGradeSummaryDoc);
                });
                if (mounted) setGrades(results);
            } catch (error) {
                console.error("Error fetching grades for student", student.id, error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        fetchGrades();
        return () => { mounted = false; };
    }, [student.id]);

    const toggleClass = (classId: string) => {
        setExpandedClassId(prev => prev === classId ? null : classId);
    };

    return (
        <Card className="mb-6 border-l-4 border-indigo-500">
            <div className="flex items-center space-x-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300 flex items-center justify-center font-bold text-xl">
                    {student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{student.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{student.series || 'Série não informada'}</p>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-4"><SpinnerIcon className="h-6 w-6 text-indigo-500 mx-auto" /></div>
            ) : grades.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-slate-500 dark:text-slate-400">Nenhum registro acadêmico encontrado para este aluno.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {grades.map(gradeDoc => {
                        const classId = gradeDoc.classId; // or derive from ID if not stored directly
                        const isExpanded = expandedClassId === classId;
                        const sortedUnits = Object.keys(gradeDoc.unidades || {}).sort();

                        return (
                            <div key={classId} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <button 
                                    onClick={() => toggleClass(classId)}
                                    className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors text-left"
                                >
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{gradeDoc.className || 'Turma'}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                
                                {isExpanded && (
                                    <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-700 space-y-4">
                                        {sortedUnits.length === 0 ? (
                                            <p className="text-sm text-slate-500">Sem notas lançadas.</p>
                                        ) : (
                                            sortedUnits.map(unitName => {
                                                const unitData = gradeDoc.unidades[unitName as Unidade];
                                                if (!unitData || !unitData.subjects) return null;
                                                
                                                return (
                                                    <div key={unitName} className="mb-4 last:mb-0">
                                                        <h5 className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 mb-2 border-b dark:border-slate-800 pb-1">{unitName}</h5>
                                                        <div className="grid gap-2">
                                                            {Object.entries(unitData.subjects).map(([subjectName, rawSubjData]) => {
                                                                const subjData = rawSubjData as GradeReportSubject;
                                                                return (
                                                                    <div key={subjectName} className="flex justify-between items-center text-sm">
                                                                        <span className="text-slate-700 dark:text-slate-300">{subjectName}</span>
                                                                        <span className={`font-bold ${getScoreColor(subjData.totalPoints)}`}>
                                                                            {Number(subjData.totalPoints).toFixed(1)} pts
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};

const GuardianDashboard: React.FC = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [wards, setWards] = useState<Ward[]>([]);
    const [isLoadingWards, setIsLoadingWards] = useState(true);
    const [newStudentId, setNewStudentId] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Fetch Wards (Dependents)
    useEffect(() => {
        const fetchWards = async () => {
            if (!user) return;
            setIsLoadingWards(true);
            try {
                const userDocRef = doc(db, "users", user.id);
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const wardIds: string[] = userData.wards || [];
                    
                    if (wardIds.length > 0) {
                        // Fetch details for each ward
                        // Firestore 'in' query supports up to 10. For now assuming < 10 wards.
                        // Ideally, we fetch individually if array is large or use Promise.all
                        const wardPromises = wardIds.map(id => getDoc(doc(db, "users", id)));
                        const wardSnaps = await Promise.all(wardPromises);
                        
                        const loadedWards: Ward[] = [];
                        wardSnaps.forEach(snap => {
                            if (snap.exists()) {
                                loadedWards.push({ id: snap.id, ...snap.data() } as Ward);
                            }
                        });
                        setWards(loadedWards);
                    } else {
                        setWards([]);
                    }
                }
            } catch (error) {
                console.error("Error fetching wards:", error);
                addToast("Erro ao carregar lista de dependentes.", "error");
            } finally {
                setIsLoadingWards(false);
            }
        };

        fetchWards();
    }, [user, addToast]);

    const handleAddStudent = async () => {
        if (!newStudentId.trim() || !user) return;
        
        // Validation: Cannot add self
        if (newStudentId === user.id) {
            addToast("Você não pode adicionar a si mesmo.", "error");
            return;
        }

        // Validation: Check if already added
        if (wards.some(w => w.id === newStudentId)) {
            addToast("Este aluno já está na sua lista.", "info");
            return;
        }

        setIsAdding(true);
        try {
            // 1. Check if student exists
            const studentRef = doc(db, "users", newStudentId);
            const studentSnap = await getDoc(studentRef);

            if (!studentSnap.exists()) {
                addToast("Aluno não encontrado. Verifique o ID.", "error");
                setIsAdding(false);
                return;
            }

            const studentData = studentSnap.data();
            if (studentData.role !== 'aluno') {
                addToast("O ID fornecido não pertence a um aluno.", "error");
                setIsAdding(false);
                return;
            }

            // 2. Check if a pending invitation already exists
            const invQuery = query(
                collection(db, "invitations"),
                where("inviterId", "==", user.id),
                where("inviteeId", "==", newStudentId),
                where("status", "==", "pending")
            );
            const invSnap = await getDocs(invQuery);
            if (!invSnap.empty) {
                addToast("Já existe uma solicitação pendente para este aluno.", "info");
                setIsAdding(false);
                return;
            }

            // 3. Create Invitation
            await addDoc(collection(db, "invitations"), {
                type: 'guardian_access_request',
                inviterId: user.id,
                inviterName: user.name,
                inviteeId: newStudentId,
                status: 'pending',
                timestamp: serverTimestamp()
            });

            // 4. Create Notification for the Student
            await createNotification({
                userId: newStudentId,
                actorId: user.id,
                actorName: user.name,
                type: 'notice_post', // Using notice type for generic alert
                title: 'Solicitação de Vínculo',
                text: `${user.name} solicitou acesso ao seu perfil escolar como responsável. Acesse seu perfil para aceitar ou recusar.`,
                classId: 'system' // Placeholder
            });

            setNewStudentId('');
            addToast("Solicitação enviada! O aluno precisa aprovar o vínculo no perfil dele.", "success");

        } catch (error) {
            console.error("Error adding student:", error);
            addToast("Erro ao adicionar aluno.", "error");
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">Painel do Responsável</h1>
                    <p className="text-slate-500 dark:text-slate-400 hc-text-secondary">Acompanhe o desempenho escolar dos seus dependentes.</p>
                </div>
            </div>

            <Card className="bg-white dark:bg-slate-800">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-grow w-full">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Adicionar Aluno (ID)
                        </label>
                        <input
                            type="text"
                            value={newStudentId}
                            onChange={(e) => setNewStudentId(e.target.value)}
                            placeholder="Cole o ID do aluno aqui..."
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                    <button
                        onClick={handleAddStudent}
                        disabled={isAdding || !newStudentId.trim()}
                        className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hc-button-primary-override"
                    >
                        {isAdding ? <SpinnerIcon /> : <span className="flex items-center"><span className="mr-2">+</span> Solicitar Acesso</span>}
                    </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    * Após enviar, peça para o aluno aceitar a solicitação na aba "Perfil" dele.
                </p>
            </Card>

            <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">Meus Dependentes</h2>
                
                {isLoadingWards ? (
                    <div className="flex justify-center py-10"><SpinnerIcon className="h-10 w-10 text-indigo-500" /></div>
                ) : wards.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Você ainda não tem dependentes vinculados.</p>
                        <p className="text-sm text-slate-400 mt-1">Use o campo acima para solicitar acesso.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {wards.map(student => (
                            <StudentGradeCard key={student.id} student={student} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GuardianDashboard;
