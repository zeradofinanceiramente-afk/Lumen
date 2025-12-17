
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
    collection, query, where, orderBy, limit, onSnapshot, Timestamp, 
    doc, writeBatch, updateDoc, setDoc, getDocs
} from 'firebase/firestore';
import { db } from '../components/firebaseClient';
import type { Notification, TeacherClass, User } from '../types';

export function useStudentNotifications(user: User | null, studentClasses: TeacherClass[]) {
    const [privateNotifications, setPrivateNotifications] = useState<Notification[]>([]);
    const [broadcastNotifications, setBroadcastNotifications] = useState<Notification[]>([]);
    const [readReceipts, setReadReceipts] = useState<Set<string>>(new Set());
    
    // Ref para evitar múltiplas solicitações de permissão em re-renders rápidos
    const permissionRequested = useRef(false);

    // --- 0. Gerenciamento de Permissões e Notificações Nativas ---
    useEffect(() => {
        if (!user) return;

        // 1. Solicitar permissão ao montar
        const requestPermission = async () => {
            if (!('Notification' in window)) return;
            
            if (Notification.permission === 'default' && !permissionRequested.current) {
                permissionRequested.current = true;
                try {
                    await Notification.requestPermission();
                } catch (error) {
                    console.error("Erro ao solicitar permissão de notificação:", error);
                }
            }
        };

        requestPermission();

        // 2. Lógica de Verificação a cada 5 Horas (Economia de Leitura)
        const checkAndSendDeviceNotifications = async () => {
            if (Notification.permission !== 'granted') return;

            const LAST_CHECK_KEY = `last_notification_check_${user.id}`;
            const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
            
            const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
            const now = Date.now();

            // Verifica se já passaram 5 horas
            if (!lastCheck || (now - parseInt(lastCheck) > FIVE_HOURS_MS)) {
                try {
                    // Query pontual (Economia de leitura vs Snapshot constante)
                    // Busca apenas notificações não lidas das últimas 24h para garantir relevância
                    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
                    
                    const q = query(
                        collection(db, "notifications"),
                        where("userId", "==", user.id),
                        where("read", "==", false),
                        where("timestamp", ">", Timestamp.fromDate(yesterday)),
                        orderBy("timestamp", "desc"),
                        limit(5) // Limita para não spamar excessivamente se houver muitas
                    );

                    const snapshot = await getDocs(q);

                    if (!snapshot.empty) {
                        snapshot.docs.forEach(doc => {
                            const data = doc.data();
                            // Envia notificação nativa
                            // Nota: Service Workers são ideais para background, mas isso funciona enquanto a aba estiver aberta/suspensa
                            new Notification("Lumen Education", {
                                body: data.title || "Você tem uma nova notificação escolar.",
                                icon: '/icons/icon-192.png',
                                tag: doc.id // Evita duplicação visual no OS
                            });
                        });
                    }

                    // Atualiza timestamp apenas se a verificação rodou com sucesso
                    localStorage.setItem(LAST_CHECK_KEY, now.toString());

                } catch (error) {
                    console.error("Falha na verificação periódica de notificações:", error);
                }
            }
        };

        // Roda a verificação ao montar e configura intervalo
        checkAndSendDeviceNotifications();
        
        // Intervalo de verificação (verifica a cada 10 minutos se o tempo de 5 horas já passou)
        const intervalId = setInterval(checkAndSendDeviceNotifications, 10 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [user]);


    // --- 1. Listener de Notificações Privadas (UI Realtime) ---
    useEffect(() => {
        if (!user || user.role !== 'aluno') return;

        const notifQuery = query(
            collection(db, "notifications"), 
            where("userId", "==", user.id), 
            where("read", "==", false), 
            orderBy("timestamp", "desc"),
            limit(20)
        );
        
        const unsubNotif = onSnapshot(notifQuery, (snap) => {
            const validNotifs: Notification[] = [];
            const now = Date.now();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

            snap.docs.forEach(d => {
                const data = d.data();
                let dateObj: Date;
                if (data.timestamp?.toDate) dateObj = data.timestamp.toDate();
                else if (typeof data.timestamp === 'string') dateObj = new Date(data.timestamp);
                else dateObj = new Date();

                if (isNaN(dateObj.getTime())) dateObj = new Date();

                if (now - dateObj.getTime() <= sevenDaysMs) {
                    validNotifs.push({ id: d.id, ...data, timestamp: dateObj.toISOString() } as Notification);
                }
            });

            setPrivateNotifications(validNotifs);
        });

        // Listener de Recibos de Leitura
        const receiptsQuery = collection(db, "users", user.id, "read_notifications");
        const unsubReceipts = onSnapshot(receiptsQuery, (snap) => {
            const ids = new Set(snap.docs.map(d => d.id));
            setReadReceipts(ids);
        });

        return () => {
            unsubNotif();
            unsubReceipts();
        };
    }, [user]);

    // --- 2. Listener de Broadcasts (Turma) ---
    useEffect(() => {
        if (!user || user.role !== 'aluno' || studentClasses.length === 0) {
            setBroadcastNotifications([]);
            return;
        }

        const myClassIds = studentClasses.map(c => c.id);
        if (myClassIds.length === 0) return;

        // Firestore limita 'in' query a 10 itens. Dividimos em chunks.
        const chunks: string[][] = [];
        for (let i = 0; i < myClassIds.length; i += 10) {
            chunks.push(myClassIds.slice(i, i + 10));
        }

        const unsubs: (() => void)[] = [];
        const chunkResults: Record<number, Notification[]> = {};

        const updateBroadcasts = () => {
            const allBroadcasts = Object.values(chunkResults).flat();
            const uniqueBroadcasts = Array.from(new Map(allBroadcasts.map(item => [item.id, item])).values());
            uniqueBroadcasts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setBroadcastNotifications(uniqueBroadcasts);
        };

        chunks.forEach((chunk, index) => {
            const broadcastQuery = query(
                collection(db, "broadcasts"),
                where("classId", "in", chunk),
                where("expiresAt", ">", Timestamp.now()) 
            );

            const unsub = onSnapshot(broadcastQuery, (snap) => {
                const fetchedBroadcasts: Notification[] = [];
                
                snap.docs.forEach(d => {
                    const data = d.data();
                    let dateObj: Date;
                    if (data.timestamp?.toDate) dateObj = data.timestamp.toDate();
                    else if (typeof data.timestamp === 'string') dateObj = new Date(data.timestamp);
                    else dateObj = new Date();

                    fetchedBroadcasts.push({
                        id: d.id,
                        title: data.title,
                        summary: data.summary,
                        urgency: 'medium', 
                        deepLink: data.deepLink || { page: 'dashboard' },
                        read: false,
                        timestamp: dateObj.toISOString(),
                        userId: user.id 
                    } as Notification);
                });

                chunkResults[index] = fetchedBroadcasts;
                updateBroadcasts();
            });
            unsubs.push(unsub);
        });

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, [user, studentClasses]);

    // Merge e Cálculo
    const notifications = useMemo(() => {
        const combined = [...privateNotifications, ...broadcastNotifications];
        
        const processed = combined.map(n => ({
            ...n,
            read: n.read || readReceipts.has(n.id)
        }));

        return processed.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }, [privateNotifications, broadcastNotifications, readReceipts]);

    const unreadNotificationCount = notifications.filter(n => !n.read).length;

    // Ações
    const handleMarkAllNotificationsRead = async () => {
        if (!user) return;
        try {
            const batch = writeBatch(db);
            
            notifications.forEach(n => {
                const isPrivate = privateNotifications.some(pn => pn.id === n.id);
                const isBroadcast = broadcastNotifications.some(bn => bn.id === n.id);
                
                if (isPrivate && !n.read) {
                    const ref = doc(db, "notifications", n.id);
                    batch.update(ref, { read: true });
                } else if (isBroadcast && !readReceipts.has(n.id)) {
                    const receiptRef = doc(db, "users", user.id, "read_notifications", n.id);
                    batch.set(receiptRef, {});
                }
            });
            
            await batch.commit();
        } catch (error) {
            console.error("Erro ao marcar notificações como lidas", error);
        }
    };

    const handleMarkNotificationAsRead = async (id: string) => {
        if (!user) return;
        try {
            const isPrivate = privateNotifications.some(pn => pn.id === id);
            
            if (isPrivate) {
                const ref = doc(db, "notifications", id);
                await updateDoc(ref, { read: true });
                setPrivateNotifications(prev => prev.filter(n => n.id !== id));
            } else {
                const receiptRef = doc(db, "users", user.id, "read_notifications", id);
                await setDoc(receiptRef, {});
                setReadReceipts(prev => new Set(prev).add(id));
            }
        } catch (error) {
            console.error("Erro ao marcar notificação como lida", error);
        }
    };

    return {
        notifications,
        unreadNotificationCount,
        handleMarkAllNotificationsRead,
        handleMarkNotificationAsRead
    };
}
