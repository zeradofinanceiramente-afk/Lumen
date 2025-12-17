
import { useState, useEffect, useCallback } from 'react';
import type { Achievement, UserStats, UserAchievementsDoc } from '../types';
import { fetchGlobalAchievements, fetchUserAchievementsDoc } from '../utils/achievements';
import { doc, getDoc, serverTimestamp, increment, setDoc } from 'firebase/firestore';
import { db } from '../components/firebaseClient';
import { useToast } from '../contexts/ToastContext';
import { processGamificationEvent } from '../utils/gamificationEngine';

export function useStudentGamification(user: any) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [userStats, setUserStats] = useState<UserStats>({ xp: 0, level: 1, xpForNextLevel: 100, levelName: 'Iniciante', streak: 0 });
    const { addToast } = useToast();

    const loadGamificationData = useCallback(async () => {
        if (!user) return;
        
        const [globalAchievements, userAchievementsDoc] = await Promise.all([
            fetchGlobalAchievements(),
            fetchUserAchievementsDoc(user.id)
        ]);

        // --- STREAK CALCULATION LOGIC ---
        let currentStreak = userAchievementsDoc.stats.loginStreak || 0;
        let lastLoginDate = userAchievementsDoc.stats.lastLoginDate;
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Midnight today
        let shouldUpdateStreak = false;

        if (!lastLoginDate) {
            // First time login logic
            currentStreak = 1;
            lastLoginDate = today.toISOString();
            shouldUpdateStreak = true;
        } else {
            const lastLogin = new Date(lastLoginDate);
            // Normalize last login to midnight
            const lastLoginMidnight = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
            
            const diffTime = today.getTime() - lastLoginMidnight.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Logged in consecutive day
                currentStreak += 1;
                lastLoginDate = today.toISOString();
                shouldUpdateStreak = true;
            } else if (diffDays > 1) {
                // Missed a day or more, reset streak
                currentStreak = 1;
                lastLoginDate = today.toISOString();
                shouldUpdateStreak = true;
            } else if (diffDays === 0) {
                // Same day login, keep existing streak
                // No update needed unless stats.loginStreak was desynced
                if (currentStreak === 0) { 
                    currentStreak = 1; 
                    shouldUpdateStreak = true; 
                }
            }
        }

        // Update Firestore if streak changed
        if (shouldUpdateStreak) {
            const userAchvRef = doc(db, "userAchievements", user.id);
            setDoc(userAchvRef, {
                stats: {
                    loginStreak: currentStreak,
                    lastLoginDate: lastLoginDate
                },
                updatedAt: serverTimestamp()
            }, { merge: true }).catch(err => console.error("Failed to update streak:", err));
        }
        // --------------------------------

        const mergedAchievements = globalAchievements.map(ach => {
            const userUnlockData = userAchievementsDoc.unlocked[ach.id];
            return {
                ...ach,
                unlocked: !!userUnlockData,
                date: userUnlockData ? new Date(userUnlockData.date).toLocaleDateString('pt-BR') : ''
            } as Achievement;
        });
        setAchievements(mergedAchievements);

        const fetchedStats: UserStats = {
            xp: userAchievementsDoc.xp,
            level: userAchievementsDoc.level,
            xpForNextLevel: 100,
            levelName: userAchievementsDoc.level < 5 ? 'Iniciante' : 'Estudante',
            streak: currentStreak
        };
        setUserStats(fetchedStats);
    }, [user]);

    // Trigger load on mount
    useEffect(() => {
        if (user) {
            loadGamificationData();
        }
    }, [user, loadGamificationData]);

    const handleQuizCompleteLogic = async (quizId: string, title: string, score: number, total: number) => {
        if (!user) return 0;

        try {
            const resultRef = doc(db, 'users', user.id, 'quiz_results', quizId);
            const resultSnap = await getDoc(resultRef);

            let xpEarned = 0;
            const previousAttempts = resultSnap.exists() ? resultSnap.data().attempts || 0 : 0;

            // Lógica de XP: 10 XP por questão acertada APENAS na PRIMEIRA tentativa.
            if (previousAttempts === 0) {
               xpEarned = score * 10;
            }

            const resultData = {
                quizId,
                title,
                lastScore: score,
                totalQuestions: total,
                lastCompletedAt: serverTimestamp(),
                attempts: increment(1),
                bestScore: resultSnap.exists() ? Math.max(resultSnap.data().bestScore || 0, score) : score
            };

            // Salva resultado do quiz
            await setDoc(resultRef, resultData, { merge: true });

            // PROCESSA A GAMIFICAÇÃO (XP + Stats + Conquistas)
            // Mesmo se xpEarned for 0, ainda conta como 'quiz_complete' para estatísticas de conquistas
            const unlockedAchievements = await processGamificationEvent(user.id, 'quiz_complete', xpEarned);

            // Atualiza estado local (opcional, pois o processGamificationEvent já salvou no banco)
            setUserStats(prev => ({ 
                ...prev, 
                xp: prev.xp + xpEarned,
                level: Math.floor((prev.xp + xpEarned) / 100) + 1 
            }));

            // Feedback para o usuário
            if (xpEarned > 0) {
                addToast(`Parabéns! Você ganhou ${xpEarned} XP!`, 'success');
            } else if (previousAttempts > 0) {
                addToast(`Quiz concluído! (Sem XP extra por repetição)`, 'info');
            } else {
                addToast(`Quiz concluído!`, 'info');
            }

            // Feedback de Conquistas
            if (unlockedAchievements.length > 0) {
                unlockedAchievements.forEach(ach => {
                    addToast(`🏆 Conquista Desbloqueada: ${ach.title}`, 'success');
                });
                // Recarrega lista para mostrar o badge desbloqueado
                loadGamificationData(); 
            }

            return xpEarned;

        } catch (error) {
            console.error("Erro ao salvar quiz:", error);
            addToast("Erro ao salvar seu resultado.", "error");
            return 0;
        }
    };

    return {
        achievements,
        userStats,
        loadGamificationData,
        handleQuizCompleteLogic,
        setUserStats // Exposto caso precise de update manual em outros fluxos
    };
}
