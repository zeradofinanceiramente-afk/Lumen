import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { useStudentNotificationsContext } from '../contexts/StudentNotificationContext';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { setCurrentPage } = useNavigation();
    
    // We use student academic context to find "recently viewed" content.
    // This context is now provided to all roles via Wrapper, so it won't crash for non-students,
    // though the data might be empty for teachers initially (which is fine, they fall back to default).
    const { inProgressModules } = useStudentAcademic();
    const { unreadNotificationCount } = useStudentNotificationsContext();

    const [defaultCoverUrl, setDefaultCoverUrl] = useState<string | null>(null);

    const firstName = user?.name.split(' ')[0] || 'Visitante';
    const activeModule = inProgressModules.length > 0 ? inProgressModules[0] : null;

    useEffect(() => {
        const fetchDefaultCover = async () => {
            try {
                const docRef = doc(db, 'system_settings', 'dashboard_config');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setDefaultCoverUrl(snap.data().defaultCoverUrl);
                }
            } catch (error) {
                console.error("Failed to load default dashboard cover", error);
            }
        };
        fetchDefaultCover();
    }, []);

    // Determine cover image: User's last module > Admin Default > Generic Fallback
    const bgImage = activeModule?.coverImageUrl || defaultCoverUrl;

    // Time-based greeting
    const hours = new Date().getHours();
    let greeting = 'Bem-vindo';
    if (hours < 12) greeting = 'Bom dia';
    else if (hours < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    return (
        <div className="space-y-12 animate-fade-in pb-12">
            {/* Hero Section */}
            <div className="flex flex-col space-y-4 pt-4 px-2">
                <h1 className="text-5xl md:text-7xl font-thin tracking-tight text-white drop-shadow-lg">
                    {greeting}, <br />
                    <span className="font-bold text-brand">{firstName}</span>.
                </h1>
                <p className="text-slate-400 text-lg md:text-xl font-light max-w-2xl leading-relaxed">
                    Seu espaço de aprendizado está pronto. O que vamos explorar hoje?
                </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Resume Learning Card */}
                <div 
                    onClick={() => setCurrentPage(activeModule ? 'modules' : 'modules')}
                    className="group relative h-64 md:h-80 rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 border border-white/10 hover:border-brand/50"
                >
                    <div className="absolute inset-0 bg-slate-900">
                        {bgImage ? (
                            <img src={bgImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-500" alt="Capa" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-black" />
                        )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 p-8">
                        <span className="inline-block px-3 py-1 mb-3 text-xs font-bold tracking-widest text-brand uppercase bg-black/50 rounded-full backdrop-blur-md border border-brand/30">
                            {activeModule ? 'Continuar' : 'Iniciar'}
                        </span>
                        <h3 className="text-2xl font-bold text-white mb-2 leading-tight group-hover:text-brand transition-colors">
                            {activeModule ? activeModule.title : "Explorar Módulos"}
                        </h3>
                        <p className="text-sm text-slate-300 line-clamp-2">
                            {activeModule ? activeModule.description : "Inicie sua jornada de conhecimento."}
                        </p>
                        {activeModule && (
                            <div className="mt-4 w-full bg-white/20 rounded-full h-1">
                                <div className="bg-brand h-1 rounded-full shadow-[0_0_10px_var(--brand-color)]" style={{ width: `${activeModule.progress || 0}%` }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Notifications Widget */}
                <div className="flex flex-col gap-6">
                    <Card className="flex-1 bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-colors cursor-pointer group" onClick={() => setCurrentPage('notifications')}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-red-500/10 rounded-full text-red-400 group-hover:text-red-300 group-hover:shadow-[0_0_15px_rgba(248,113,113,0.3)] transition-all">
                                {ICONS.notifications}
                            </div>
                            <span className="text-4xl font-bold text-white">{unreadNotificationCount}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-200 group-hover:text-white">Notificações</h3>
                        <p className="text-sm text-slate-500">Pendências e avisos.</p>
                    </Card>

                    <Card className="flex-1 bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-colors cursor-pointer group" onClick={() => setCurrentPage('activities')}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-brand/10 rounded-full text-brand group-hover:shadow-[0_0_15px_var(--brand-color)] transition-all">
                                {ICONS.activities}
                            </div>
                            <span className="text-2xl font-bold text-white">→</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-200 group-hover:text-white">Atividades</h3>
                        <p className="text-sm text-slate-500">Ver tarefas da semana.</p>
                    </Card>
                </div>

                {/* 3. Achievements / Map */}
                <div 
                    onClick={() => setCurrentPage('interactive_map')}
                    className="group relative h-64 md:h-80 rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 border border-white/10 hover:border-emerald-500/50"
                >
                    <div className="absolute inset-0 bg-slate-900">
                         <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000" className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-1000" alt="" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 p-8">
                        <div className="mb-3">
                            <div className="p-3 bg-emerald-500/20 inline-block rounded-full text-emerald-400 backdrop-blur-md border border-emerald-500/30 group-hover:shadow-[0_0_15px_rgba(52,211,153,0.4)] transition-all">
                                {ICONS.map}
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">Mapa do Tempo</h3>
                        <p className="text-sm text-slate-300">Navegue pela história de forma interativa.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;