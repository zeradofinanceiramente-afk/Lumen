
// FILE: components/Sidebar.tsx
import React, { useMemo } from 'react';
import type { Page } from '../types';
import { Logo, ICONS } from '../constants/index';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useStudentNotificationsContext } from '../contexts/StudentNotificationContext';
import { useTeacherAcademicContext } from '../contexts/TeacherAcademicContext';
import { useLanguage } from '../contexts/LanguageContext';

const getIcon = (id: Page) => {
    switch (id) {
        case 'dashboard': return ICONS.dashboard;
        case 'modules': return ICONS.modules;
        case 'quizzes': return ICONS.quizzes;
        case 'activities': return ICONS.activities;
        case 'achievements': return ICONS.achievements;
        case 'boletim': return ICONS.boletim;
        case 'join_class': return ICONS.join_class;
        case 'interactive_map': return ICONS.map;
        case 'teacher_dashboard': return ICONS.teacher_dashboard;
        case 'teacher_pending_activities': return ICONS.teacher_pending_activities;
        case 'teacher_create_module': return ICONS.teacher_create_module;
        case 'teacher_create_activity': return ICONS.teacher_create_activity;
        case 'teacher_statistics': return ICONS.teacher_statistics;
        case 'teacher_school_records': return ICONS.teacher_school_records;
        case 'teacher_repository': return ICONS.repository;
        case 'teacher_module_repository': return ICONS.modules;
        case 'director_dashboard': return ICONS.director_dashboard;
        case 'secretariat_dashboard': return ICONS.dashboard;
        case 'secretariat_schools': return ICONS.director_dashboard;
        case 'secretariat_statistics': return ICONS.teacher_statistics;
        case 'state_secretariat_dashboard': return ICONS.state_secretariat_dashboard;
        case 'guardian_dashboard': return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-1.78-4.125a4 4 0 00-6.44 0A6 6 0 003 20v1h12z" /></svg>;
        case 'admin_dashboard': return ICONS.dashboard;
        case 'admin_users': return ICONS.admin_users;
        case 'admin_modules': return ICONS.modules;
        case 'admin_quizzes': return ICONS.quizzes;
        case 'admin_achievements': return ICONS.achievements;
        case 'admin_stats': return ICONS.teacher_statistics;
        case 'admin_tests': return ICONS.admin_tests;
        case 'admin_diagnostics': return ICONS.diagnostics;
        default: return null;
    }
};

const StudentNotificationBadge: React.FC = () => {
    const { unreadNotificationCount } = useStudentNotificationsContext();
    if (unreadNotificationCount <= 0) return null;
    return (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-[#09090b]" aria-label={`${unreadNotificationCount} novas notificações`}>
            {unreadNotificationCount}
        </span>
    );
};

const TeacherPendingBadge: React.FC = () => {
    const { dashboardStats } = useTeacherAcademicContext();
    const pendingCount = dashboardStats.totalPendingSubmissions;
    if (pendingCount <= 0) return null;
    return (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-[#09090b]" aria-label={`${pendingCount} pendentes`}>
            {pendingCount}
        </span>
    );
};

export const Sidebar: React.FC = () => {
    const { currentPage, setCurrentPage, isMobileMenuOpen, toggleMobileMenu } = useNavigation();
    const { handleLogout: onLogout, userRole } = useAuth();
    const { t } = useLanguage();
    
    const navItems = useMemo(() => {
        if (userRole === 'aluno') {
            return [
                { id: 'dashboard' as Page, label: 'Início' },
                { id: 'modules' as Page, label: t('sidebar.modules') },
                { id: 'quizzes' as Page, label: t('sidebar.quizzes') },
                { id: 'activities' as Page, label: t('sidebar.activities') },
                { id: 'interactive_map' as Page, label: t('sidebar.map') },
                { id: 'achievements' as Page, label: t('sidebar.achievements') },
                { id: 'boletim' as Page, label: t('sidebar.boletim') },
                { id: 'join_class' as Page, label: t('sidebar.turmas') },
            ];
        } else if (userRole === 'professor') {
            return [
                { id: 'dashboard' as Page, label: 'Início' },
                { id: 'teacher_dashboard' as Page, label: t('sidebar.teacher_dashboard') },
                { id: 'teacher_pending_activities' as Page, label: t('sidebar.pending') },
                { id: 'modules' as Page, label: t('sidebar.modules') },
                { id: 'interactive_map' as Page, label: t('sidebar.map') },
                { id: 'teacher_module_repository' as Page, label: t('sidebar.repo_modules') }, 
                { id: 'teacher_repository' as Page, label: t('sidebar.repo_questions') },
                { id: 'teacher_statistics' as Page, label: t('sidebar.stats') },
                { id: 'teacher_school_records' as Page, label: t('sidebar.history') },
            ];
        } else if (userRole === 'direcao') {
            return [
                { id: 'dashboard' as Page, label: 'Início' },
                { id: 'director_dashboard' as Page, label: t('sidebar.director_panel') },
                { id: 'teacher_statistics' as Page, label: t('sidebar.stats') },
                { id: 'teacher_school_records' as Page, label: t('sidebar.history') },
                { id: 'modules' as Page, label: t('sidebar.repo_modules') },
            ];
        } else if (userRole === 'secretaria') {
            return [
                { id: 'dashboard' as Page, label: 'Início' },
                { id: 'secretariat_dashboard' as Page, label: t('sidebar.secretariat_panel') },
                { id: 'secretariat_schools' as Page, label: t('sidebar.monitor') },
                { id: 'secretariat_statistics' as Page, label: t('sidebar.state_data') },
            ];
        } else if (userRole === 'secretaria_estadual') {
            return [
                { id: 'dashboard' as Page, label: 'Início' },
                { id: 'state_secretariat_dashboard' as Page, label: 'Painel Estadual' },
            ];
        } else if (userRole === 'admin') {
            return [
                { id: 'dashboard' as Page, label: 'Início' },
                { id: 'admin_dashboard' as Page, label: t('sidebar.admin_dash') },
                { id: 'admin_modules' as Page, label: t('sidebar.admin_mods') },
                { id: 'admin_quizzes' as Page, label: t('sidebar.admin_quiz') },
                { id: 'admin_achievements' as Page, label: t('sidebar.admin_achv') },
                { id: 'admin_stats' as Page, label: t('sidebar.stats') },
                { id: 'admin_tests' as Page, label: t('sidebar.admin_tests') },
                { id: 'admin_diagnostics' as Page, label: 'Diagnóstico do Sistema' }, // Adicionado aqui
            ];
        } else if (userRole === 'responsavel') {
            return [
                { id: 'dashboard' as Page, label: 'Início' },
                { id: 'guardian_dashboard' as Page, label: t('sidebar.guardian_panel') },
            ];
        }
        return [];
    }, [userRole, t]);

    const showProfileLink = true;
    const showNotificationsLink = userRole === 'aluno';
    
    return (
        <>
            {/* Overlay for all screens (Drawer behavior) - High Contrast & Smoothness */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-all duration-500 ease-in-out ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={toggleMobileMenu}
                aria-hidden="true"
            ></div>

            {/* Sidebar with Glassmorphism - Always Fixed/Floating now */}
            <aside 
                className={`w-72 glass-sidebar text-slate-200 flex flex-col h-full fixed inset-y-0 left-0 z-50 transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isMobileMenuOpen ? 'translate-x-0 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full'}`}
                id="main-sidebar"
            >
                {/* Header padding ajustado para não conflitar com o botão de toggle */}
                <div className="p-6 pl-20 md:pl-6 border-b border-white/10 flex items-center justify-center md:justify-start min-h-[5rem]">
                    <Logo />
                </div>
                
                <nav className="flex-1 px-4 py-6 space-y-2 custom-scrollbar overflow-y-auto" aria-label="Navegação Principal">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setCurrentPage(item.id); toggleMobileMenu(); }}
                            aria-current={currentPage === item.id ? 'page' : undefined}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left group border ${
                                currentPage === item.id 
                                ? 'bg-brand text-white shadow-brand-glow border-white/20 font-bold' 
                                : 'hover:bg-white/5 text-slate-400 hover:text-white border-transparent hover:border-white/5'
                            }`}
                        >
                            <div className="flex items-center space-x-4">
                                <span aria-hidden="true" className={currentPage === item.id ? 'text-white scale-110' : 'text-slate-400 group-hover:text-white transition-all'}>{getIcon(item.id)}</span>
                                <span className="tracking-wide text-sm">{item.label}</span>
                            </div>
                            {item.id === 'teacher_pending_activities' && (userRole === 'professor') && (
                                <TeacherPendingBadge />
                            )}
                        </button>
                    ))}
                </nav>
                
                <div className="px-4 py-6 border-t border-white/10 space-y-2 bg-gradient-to-t from-black/40 to-transparent">
                     {showNotificationsLink && (
                        <button
                            onClick={() => { setCurrentPage('notifications'); toggleMobileMenu(); }}
                            aria-current={currentPage === 'notifications' ? 'page' : undefined}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left border ${
                                currentPage === 'notifications' ? 'bg-brand text-white shadow-brand-glow border-white/20' : 'hover:bg-white/5 text-slate-400 hover:text-white border-transparent'
                            }`}
                        >
                            <div className="flex items-center space-x-4">
                                <span aria-hidden="true" className={currentPage === 'notifications' ? 'text-white' : 'text-slate-400'}>{ICONS['notifications']}</span>
                                <span className="text-sm font-medium">{t('sidebar.notifications')}</span>
                            </div>
                            <StudentNotificationBadge />
                        </button>
                     )}
                     {showProfileLink && (
                         <button
                            onClick={() => { setCurrentPage('profile'); toggleMobileMenu(); }}
                            aria-current={currentPage === 'profile' ? 'page' : undefined}
                            className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 text-left border ${
                                currentPage === 'profile' ? 'bg-brand text-white shadow-brand-glow border-white/20' : 'hover:bg-white/5 text-slate-400 hover:text-white border-transparent'
                            }`}
                        >
                            <span aria-hidden="true" className={currentPage === 'profile' ? 'text-white' : 'text-slate-400'}>{ICONS.profile}</span>
                            <span className="text-sm font-medium">{t('sidebar.profile')}</span>
                        </button>
                     )}
                    <button onClick={onLogout} className="flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left hover:bg-red-900/20 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-900/30 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span className="text-sm font-medium">{t('sidebar.logout')}</span>
                    </button>
                </div>
            </aside>
        </>
    );
};
