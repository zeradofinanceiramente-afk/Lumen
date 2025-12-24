
import { useCallback, useEffect } from 'react';
import { 
    collection, query, where, getDocs, doc, addDoc, serverTimestamp, 
    updateDoc, arrayUnion, writeBatch
} from 'firebase/firestore';
import { db } from '../../components/firebaseClient';
import type { TeacherClass, AttendanceSession, Turno, User, Activity, ClassSummary, AttendanceStatus } from '../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useTeacherClasses(user: User | null, addToast: (msg: string, type: any) => void) {
    const queryClient = useQueryClient();

    // --- 1. QUERY: Classes List ---
    const { data: allClasses = [], isLoading: isLoadingClasses, refetch } = useQuery({
        queryKey: ['teacherClasses', user?.id],
        queryFn: async () => {
            if (!user) return [];
            
            const qClasses = query(collection(db, "classes"), where("teachers", "array-contains", user.id));
            const snapClasses = await getDocs(qClasses);
            
            const classes: TeacherClass[] = [];

            snapClasses.docs.forEach(d => {
                const data = d.data();
                
                // Soft-delete filter
                if (data.inactiveTeachers && data.inactiveTeachers.includes(user.id)) return;

                const rawNotices = Array.isArray(data.notices) ? data.notices : [];
                const myNotices = rawNotices.filter((n: any) => n.authorId === user.id).map((n: any) => ({
                    ...n,
                    timestamp: n.timestamp?.toDate ? n.timestamp.toDate().toISOString() : n.timestamp
                }));

                const cls = {
                    id: d.id,
                    ...data,
                    students: Array.isArray(data.students) ? data.students : [],
                    notices: myNotices,
                    noticeCount: myNotices.length,
                    modules: [],
                    activities: [], 
                    isFullyLoaded: false, 
                    isSummaryOnly: false,
                    isArchived: data.isArchived || false
                } as TeacherClass;

                classes.push(cls);
            });

            return classes;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 10, // 10 mins
    });

    const teacherClasses = allClasses.filter(c => !c.isArchived);
    const archivedClasses = allClasses.filter(c => c.isArchived);

    // --- 2. EFFECT: Sync User Summary ---
    useEffect(() => {
        if (user && allClasses.length > 0) {
            const summaryToSave: ClassSummary[] = allClasses.map(c => ({
                id: c.id,
                name: c.name,
                code: c.code,
                studentCount: c.studentCount || (c.students?.length || 0),
                isArchived: c.isArchived
            }));

            // Use fire-and-forget for side effects to avoid render loops
            updateDoc(doc(db, "users", user.id), { myClassesSummary: summaryToSave })
                .catch(err => console.warn("Failed to update class summary stats", err));
        }
    }, [allClasses, user]);

    // --- 3. MUTATIONS ---

    const createClassMutation = useMutation({
        mutationFn: async ({ name, coverImageUrl }: { name: string, coverImageUrl?: string }) => {
            if (!user) throw new Error("User not authenticated");
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const newClassPayload = { 
                 name, 
                 coverImageUrl: coverImageUrl || null,
                 teacherId: user.id, 
                 teachers: [user.id], 
                 subjects: { [user.id]: 'Regente' }, 
                 teacherNames: { [user.id]: user.name }, 
                 code, 
                 students: [], 
                 studentCount: 0, 
                 notices: [], 
                 noticeCount: 0, 
                 createdAt: serverTimestamp(),
                 isArchived: false
            };
            await addDoc(collection(db, "classes"), newClassPayload);
            return { success: true };
        },
        onSuccess: () => {
            addToast("Turma criada!", "success");
            queryClient.invalidateQueries({ queryKey: ['teacherClasses'] });
        },
        onError: () => addToast("Erro ao criar turma.", "error")
    });

    const archiveClassMutation = useMutation({
        mutationFn: async (classId: string) => {
            await updateDoc(doc(db, 'classes', classId), { isArchived: true });
        },
        onSuccess: () => {
            addToast("Turma arquivada!", "success");
            queryClient.invalidateQueries({ queryKey: ['teacherClasses'] });
        },
        onError: () => addToast("Erro ao arquivar.", "error")
    });

    const leaveClassMutation = useMutation({
        mutationFn: async (classId: string) => {
            if (!user) return;
            await updateDoc(doc(db, 'classes', classId), {
                inactiveTeachers: arrayUnion(user.id)
            });
        },
        onSuccess: () => {
            addToast("Você saiu da turma.", "success");
            queryClient.invalidateQueries({ queryKey: ['teacherClasses'] });
        },
        onError: () => addToast("Erro ao sair da turma.", "error")
    });

    // --- 4. CLASS DETAILS (On-Demand) ---
    const fetchClassDetails = useCallback(async (classId: string) => {
        if (!user) return;
        try {
            const [snapActivities, snapSessions] = await Promise.all([
                getDocs(query(collection(db, "activities"), where("classId", "==", classId), where("creatorId", "==", user.id))),
                getDocs(query(collection(db, "attendance_sessions"), where("classId", "==", classId), where("teacherId", "==", user.id)))
            ]);

            const activities = snapActivities.docs.map(d => ({ 
                id: d.id, ...d.data(), className: teacherClasses.find(c=>c.id === classId)?.name || 'Turma' 
            } as Activity));

            const sessions = snapSessions.docs.map(d => ({
                id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.().toISOString()
            } as AttendanceSession)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            queryClient.setQueryData(['teacherClasses', user.id], (old: TeacherClass[] | undefined) => {
                if (!old) return old;
                return old.map(c => {
                    if (c.id === classId) {
                        return { ...c, activities, isFullyLoaded: true };
                    }
                    return c;
                });
            });
            
            queryClient.setQueryData(['classSessions', classId], sessions);

        } catch (error) {
            console.error(error);
        }
    }, [user, queryClient, teacherClasses]);

    const getSessionsForClass = (classId: string) => {
        return queryClient.getQueryData<AttendanceSession[]>(['classSessions', classId]) || [];
    };

    const attendanceSessionsByClass = allClasses.reduce((acc, cls) => {
        acc[cls.id] = getSessionsForClass(cls.id);
        return acc;
    }, {} as Record<string, AttendanceSession[]>);


    // --- Attendance Logic ---
    const createSessionMutation = useMutation({
        mutationFn: async ({ classId, date, turno, horario }: any) => {
            if (!user) throw new Error("Auth");
            const sessionData = { classId, date, turno, horario, teacherId: user.id, createdAt: serverTimestamp() };
            const docRef = await addDoc(collection(db, "attendance_sessions"), sessionData);
            
            const cls = allClasses.find(c => c.id === classId);
            if (cls?.students?.length) {
                const batch = writeBatch(db);
                const recordsRef = collection(db, "attendance_sessions", docRef.id, "records");
                cls.students.forEach(student => {
                    batch.set(doc(recordsRef), { sessionId: docRef.id, studentId: student.id, studentName: student.name, status: 'pendente', updatedAt: serverTimestamp() });
                });
                await batch.commit();
            }
            return { ...sessionData, id: docRef.id, createdAt: new Date().toISOString() };
        },
        onSuccess: (newSession, variables) => {
            addToast("Chamada criada!", "success");
            queryClient.setQueryData(['classSessions', variables.classId], (old: any[] = []) => [newSession, ...old]);
        }
    });

    const updateAttendanceStatus = async (sessionId: string, recordId: string, status: AttendanceStatus) => {
        await updateDoc(doc(db, "attendance_sessions", sessionId, "records", recordId), { 
            status, updatedAt: serverTimestamp() 
        });
    };

    const setTeacherClasses = useCallback((updater: any) => {
        queryClient.setQueryData(['teacherClasses', user?.id], (oldData: TeacherClass[] | undefined) => {
            if (!oldData) return [];
            return typeof updater === 'function' ? updater(oldData) : updater;
        });
    }, [queryClient, user?.id]);

    return {
        teacherClasses,
        archivedClasses,
        attendanceSessionsByClass,
        isLoadingClasses,
        isSubmittingClass: createClassMutation.isPending || archiveClassMutation.isPending || leaveClassMutation.isPending,
        fetchTeacherClasses: async (force?: boolean) => { if (force) refetch(); },
        fetchClassDetails,
        handleCreateClass: (name: string, coverImageUrl?: string) => createClassMutation.mutateAsync({ name, coverImageUrl }),
        handleArchiveClass: archiveClassMutation.mutateAsync,
        handleLeaveClass: leaveClassMutation.mutateAsync,
        handleCreateAttendanceSession: (id: string, d: string, t: Turno, h: number) => createSessionMutation.mutateAsync({ classId: id, date: d, turno: t, horario: h }),
        handleUpdateAttendanceStatus: updateAttendanceStatus,
        setTeacherClasses
    };
}
