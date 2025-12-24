
import React, { useEffect, useState } from 'react';
import { ICONS } from '../constants/index';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';

const TeacherDashboard: React.FC = () => {
    const { user } = useAuth();
    const { setCurrentPage } = useNavigation();
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    
    // Saudação baseada no horário
    const hours = new Date().getHours();
    let greeting = 'Olá';
    if (hours < 12) greeting = 'Bom dia';
    else if (hours < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';
    
    const firstName = user?.name.split(' ')[0] || 'Professor';

    // Busca a imagem configurada pelo Admin com Cache de Sessão para performance
    useEffect(() => {
        const loadCover = async () => {
            // 1. Tenta pegar do cache da sessão para carregamento instantâneo
            const cachedCover = sessionStorage.getItem('dashboard_admin_cover');
            if (cachedCover) {
                setCoverUrl(cachedCover);
                return;
            }

            // 2. Se não tiver no cache, busca no Firestore
            try {
                const docRef = doc(db, 'system_settings', 'dashboard_config');
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data().defaultCoverUrl) {
                    const url = snap.data().defaultCoverUrl;
                    setCoverUrl(url);
                    sessionStorage.setItem('dashboard_admin_cover', url); // Salva no cache
                }
            } catch (error) {
                console.error("Erro ao carregar capa do admin:", error);
            }
        };

        loadCover();
    }, []); // Array vazio garante que rode apenas uma vez na montagem

    // Fallback image se o admin não tiver configurado nada
    const displayCover = coverUrl || "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1000&auto=format&fit=crop";

    return (
        <div className="space-y-24 animate-fade-in pb-12">
            {/* 1. Hero Section: Saudação Minimalista Alinhada à Esquerda e mais topo */}
            <div className="flex flex-col space-y-4 pt-0 px-2 max-w-4xl">
                <h1 className="text-5xl md:text-7xl font-thin tracking-tight text-slate-800 dark:text-white drop-shadow-sm">
                    {greeting}, <br />
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                        Professor {firstName}
                    </span>.
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl font-light max-w-2xl leading-relaxed">
                    Bem-vindo à sua central de ensino. Escolha uma ferramenta para começar.
                </p>
            </div>

            {/* 2. Layout Grid: Conteúdo invade a direita (2/3 da tela) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Coluna Esquerda Expandida: Cards Lado a Lado */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    
                    {/* Card 1: Explorar Módulos (Com imagem dinâmica) */}
                    <div 
                        onClick={() => setCurrentPage('modules')}
                        className="group relative h-48 rounded-3xl overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-200 dark:border-white/10 hover:-translate-y-1 bg-slate-900"
                    >
                        {/* Imagem de Fundo Dinâmica */}
                        <div className="absolute inset-0">
                            <img 
                                src={displayCover} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700" 
                                alt="Biblioteca" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                        </div>
                        
                        <div className="absolute bottom-0 left-0 p-5 z-10 w-full">
                            <div className="mb-2">
                                <div className="p-2 bg-blue-500/20 inline-block rounded-full text-blue-400 backdrop-blur-md border border-blue-500/30 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300">
                                    {ICONS.modules}
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-0.5 group-hover:text-blue-400 transition-colors leading-tight">
                                Explorar Módulos
                            </h3>
                            <p className="text-[11px] text-slate-300 font-light leading-snug opacity-90">
                                Inicie sua jornada de conhecimento.
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Mapa do Tempo */}
                    <div 
                        onClick={() => setCurrentPage('interactive_map')}
                        className="group relative h-48 rounded-3xl overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-200 dark:border-white/10 hover:-translate-y-1 bg-slate-900"
                    >
                        {/* Imagem de Fundo Abstrata (História/Mapa) */}
                        <div className="absolute inset-0">
                            <img 
                                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000" 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700" 
                                alt="Mapa Interativo" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                        </div>
                        
                        <div className="absolute bottom-0 left-0 p-5 z-10 w-full">
                            <div className="mb-2">
                                <div className="p-2 bg-emerald-500/20 inline-block rounded-full text-emerald-400 backdrop-blur-md border border-emerald-500/30 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all duration-300">
                                    {ICONS.map}
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-0.5 group-hover:text-emerald-400 transition-colors leading-tight">
                                Mapa do Tempo
                            </h3>
                            <p className="text-[11px] text-slate-300 font-light leading-snug opacity-90">
                                Navegue pela história de forma interativa.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Coluna Direita: Zona de Respiro Reduzida (1/3) */}
                <div className="hidden lg:block lg:col-span-1">
                    {/* Espaço intencionalmente vazio para criar leveza visual */}
                </div>

            </div>
        </div>
    );
};

export default TeacherDashboard;
