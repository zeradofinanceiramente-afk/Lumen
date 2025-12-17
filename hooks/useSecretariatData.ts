
import { useState, useCallback, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../components/firebaseClient';
import type { User, SchoolData } from '../types';

export function useSecretariatData(user: User | null, addToast: (msg: string, type: any) => void) {
    const [schools, setSchools] = useState<SchoolData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingSchool, setIsAddingSchool] = useState(false);
    
    // Derived stats
    const [globalStats, setGlobalStats] = useState({
        totalSchools: 0,
        totalClasses: 0,
        totalStudents: 0
    });

    const fetchSchools = useCallback(async () => {
        if (!user || user.role !== 'secretaria') return;
        setIsLoading(true);

        try {
            // 1. Get user profile to find linkedSchoolIds
            const userRef = doc(db, "users", user.id);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                setSchools([]);
                setIsLoading(false);
                return;
            }

            const userData = userSnap.data();
            const linkedSchoolIds: string[] = userData.linkedSchoolIds || [];

            if (linkedSchoolIds.length === 0) {
                setSchools([]);
                setGlobalStats({ totalSchools: 0, totalClasses: 0, totalStudents: 0 });
                setIsLoading(false);
                return;
            }

            // 2. Fetch Schools (Directors) Details
            // Note: Firestore 'in' query limited to 10. If > 10, need multiple queries.
            // Simplified for Phase 1 (assuming < 10 or fetch individually)
            
            const schoolPromises = linkedSchoolIds.map(async (directorId) => {
                const directorRef = doc(db, "users", directorId);
                const directorSnap = await getDoc(directorRef);
                
                if (!directorSnap.exists()) return null;
                
                const directorData = directorSnap.data();
                
                // Fetch stats for this school (aggregate from classes where teacherId == directorId or creatorRole == direcao)
                // Assuming Directors create classes with their ID as 'teacherId' or we check creatorId
                const qClasses = query(collection(db, "classes"), where("teacherId", "==", directorId));
                const classesSnap = await getDocs(qClasses);
                
                let schoolTotalClasses = 0;
                let schoolTotalStudents = 0;
                
                classesSnap.forEach(clsDoc => {
                    const clsData = clsDoc.data();
                    schoolTotalClasses++;
                    schoolTotalStudents += (clsData.studentCount || (clsData.students?.length || 0));
                });

                return {
                    id: directorId,
                    name: directorData.name || 'Escola sem nome',
                    email: directorData.email || '',
                    totalClasses: schoolTotalClasses,
                    totalStudents: schoolTotalStudents
                } as SchoolData;
            });

            const loadedSchools = (await Promise.all(schoolPromises)).filter((s): s is SchoolData => s !== null);
            setSchools(loadedSchools);

            // Calculate Global Stats
            const stats = loadedSchools.reduce((acc, curr) => ({
                totalSchools: acc.totalSchools + 1,
                totalClasses: acc.totalClasses + curr.totalClasses,
                totalStudents: acc.totalStudents + curr.totalStudents
            }), { totalSchools: 0, totalClasses: 0, totalStudents: 0 });
            
            setGlobalStats(stats);

        } catch (error) {
            console.error("Error fetching secretariat data:", error);
            addToast("Erro ao carregar dados.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchSchools();
    }, [fetchSchools]);

    const handleAddSchool = async (directorId: string) => {
        if (!user) return;
        if (!directorId.trim()) {
            addToast("ID da escola inválido.", "error");
            return;
        }

        setIsAddingSchool(true);
        try {
            // Validate Director ID
            const directorRef = doc(db, "users", directorId);
            const directorSnap = await getDoc(directorRef);
            
            if (!directorSnap.exists()) {
                addToast("ID não encontrado no sistema.", "error");
                setIsAddingSchool(false);
                return;
            }
            
            const directorData = directorSnap.data();
            if (directorData.role !== 'direcao') {
                addToast("Este ID não pertence a um perfil de Direção.", "error");
                setIsAddingSchool(false);
                return;
            }

            // Check if already added
            if (schools.some(s => s.id === directorId)) {
                addToast("Esta escola já está na lista.", "info");
                setIsAddingSchool(false);
                return;
            }

            // Link
            const userRef = doc(db, "users", user.id);
            await updateDoc(userRef, {
                linkedSchoolIds: arrayUnion(directorId)
            });

            addToast("Escola adicionada com sucesso!", "success");
            fetchSchools(); // Refresh list

        } catch (error) {
            console.error("Error adding school:", error);
            addToast("Erro ao adicionar escola.", "error");
        } finally {
            setIsAddingSchool(false);
        }
    };

    return {
        schools,
        globalStats,
        isLoading,
        isAddingSchool,
        handleAddSchool,
        fetchSchools
    };
}
