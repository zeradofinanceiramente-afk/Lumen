
import React, { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { DebugTools } from './components/common/DebugTools';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { RoleSelectionPage } from './components/RoleSelectionPage';
import { YearSelectionPage } from './components/YearSelectionPage';
import type { Page, Role } from './types';
import './styles/themes.css';

// Providers
import { AppProviders } from './components/AppProviders';
import { StudentContextWrapper, TeacherContextWrapper, AdminContextWrapper, SecretariatContextWrapper, StateSecretariatContextWrapper } from './components/RoleContextWrappers';
import { useSettings } from './contexts/SettingsContext';

// Lazy-loaded page components
const Dashboard = lazy(() => import('./components/Dashboard'));
const Modules = lazy(() => import('./components/Modules'));
const Quizzes = lazy(() => import('./components/Quizzes'));
const Activities = lazy(() => import('./components/Activities'));
const StudentActivityResponse = lazy(() => import('./components/StudentActivityResponse'));
const Achievements = lazy(() => import('./components/Achievements'));
const JoinClass = lazy(() => import('./components/JoinClass'));
const Profile = lazy(() => import('./components/Profile'));
const NotificationsPage = lazy(() => import('./components/NotificationsPage'));
const ModuleViewPage = lazy(() => import('./components/ModuleViewPage'));
const Boletim = lazy(() => import('./components/Boletim'));
const InteractiveMap = lazy(() => import('./components/InteractiveMap'));

// Teacher Components
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard')); // Home (Simple)
const TeacherClassesList = lazy(() => import('./components/TeacherClassesList')); // Minhas Turmas (List)
const ModuleCreator = lazy(() => import('./components/ModuleCreator'));
const CreateActivity = lazy(() => import('./components/CreateActivity'));
const CreateInteractiveActivity = lazy(() => import('./components/CreateInteractiveActivity')); // NEW
const TeacherStatistics = lazy(() => import('./components/TeacherStatistics'));
const PendingActivities = lazy(() => import('./components/PendingActivities'));
const TeacherGradingView = lazy(() => import('./components/TeacherGradingView'));
const SchoolRecords = lazy(() => import('./components/SchoolRecords'));
const ClassView = lazy(() => import('./components/ClassView'));
const TeacherRepository = lazy(() => import('./components/TeacherRepository'));
const TeacherModuleRepository = lazy(() => import('./components/TeacherModuleRepository'));

// Director Components
const DirectorDashboard = lazy(() => import('./components/DirectorDashboard'));

// Secretariat Components
const SecretariatDashboard = lazy(() => import('./components/SecretariatDashboard'));

// State Secretariat Components
const StateSecretariatDashboard = lazy(() => import('./components/StateSecretariatDashboard'));

// Guardian Components
const GuardianDashboard = lazy(() => import('./components/GuardianDashboard'));

// Admin Components
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminManageUsers = lazy(() => import('./components/AdminManageUsers'));
const AdminManageModules = lazy(() => import('./components/AdminManageModules'));
const AdminManageQuizzes = lazy(() => import('./components/AdminManageQuizzes'));
const AdminManageAchievements = lazy(() => import('./components/AdminManageAchievements'));
const AdminGamification = lazy(() => import('./components/AdminGamification')); // NEW
const AdminStats = lazy(() => import('./components/AdminStats'));
const AdminTests = lazy(() => import('./components/AdminTests'));
const AdminDiagnostics = lazy(() => import('./components/AdminDiagnostics')); // NEW
const CreateAchievement = lazy(() => import('./components/CreateAchievement'));
const AdminCreateModule = lazy(() => import('./components/AdminCreateModule'));
const AdminCreateQuiz = lazy(() => import('./components/AdminCreateQuiz'));

const PAGE_TITLES: Record<string, string> = {
    dashboard: 'Início',
    modules: 'Módulos',
    quizzes: 'Quizzes',
    activities: 'Atividades',
    achievements: 'Conquistas',
    join_class: 'Turmas',
    profile: 'Meu Perfil',
    notifications: 'Notificações',
    boletim: 'Boletim',
    interactive_map: 'Mapa Interativo',
    teacher_dashboard: 'Minhas Turmas', // Sidebar label matches this key
    teacher_statistics: 'Estatísticas',
    teacher_school_records: 'Histórico Escolar',
    teacher_repository: 'Banco de Questões',
    teacher_module_repository: 'Banco de Módulos',
    director_dashboard: 'Painel da Direção',
    secretariat_dashboard: 'Painel da Secretaria',
    secretariat_schools: 'Monitoramento de Escolas',
    secretariat_statistics: 'Estatísticas Estaduais',
    state_secretariat_dashboard: 'Painel Estadual',
    guardian_dashboard: 'Painel do Responsável',
    admin_dashboard: 'Painel do Administrador',
    admin_users: 'Gerenciar Usuários',
    admin_modules: 'Gerenciar Módulos',
    admin_quizzes: 'Gerenciar Quizzes',
    admin_achievements: 'Gerenciar Conquistas',
    admin_gamification: 'Gamificação & XP',
    admin_stats: 'Estatísticas da Plataforma',
    admin_tests: 'Painel de Testes',
    admin_diagnostics: 'Diagnóstico do Sistema',
};

const LoadingSpinner: React.FC = () => (
    <div role="status" className="flex justify-center items-center h-full pt-16">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand"></div>
        <span className="sr-only">Carregando conteúdo...</span>
    </div>
);

const useKeyboardShortcuts = () => {
    const { userRole } = useAuth();
    const { setCurrentPage } = useNavigation();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

            if (event.altKey) {
                const key = event.key.toLowerCase();
                let targetPage: Page | null = null;
                
                if (userRole === 'aluno') {
                    if (key === 'h') targetPage = 'dashboard';
                    if (key === 'm') targetPage = 'modules';
                    else if (key === 'q') targetPage = 'quizzes';
                    else if (key === 'a') targetPage = 'activities';
                    else if (key === 'c') targetPage = 'achievements';
                    else if (key === 't') targetPage = 'join_class';
                    else if (key === 'p') targetPage = 'profile';
                    else if (key === 'n') targetPage = 'notifications';
                    else if (key === 'b') targetPage = 'boletim';
                }
                // ... other roles
                if (targetPage) {
                    event.preventDefault();
                    setCurrentPage(targetPage);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [userRole, setCurrentPage]);
};

const MainLayout: React.FC = () => {
    useKeyboardShortcuts();
    const { userRole } = useAuth();
    const { currentPage, activeModule, activeClass, activeActivity, activeQuiz, gradingActivity, toggleMobileMenu, isMobileMenuOpen } = useNavigation();
    const { wallpaper, enableWallpaperMask, globalTheme, enableFocusMode } = useSettings();
    
    const [isScrolled, setIsScrolled] = useState(false);
    const mainContentRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const mainEl = mainContentRef.current;
        if (!mainEl) return;
        const handleScroll = () => setIsScrolled(mainEl.scrollTop > 20);
        mainEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => mainEl.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (mainContentRef.current) mainContentRef.current.scrollTop = 0;
        document.getElementById('page-main-heading')?.focus({ preventScroll: true });
    }, [currentPage]);

    const renderPage = () => {
        if (userRole === 'admin') {
            switch (currentPage) {
                case 'admin_dashboard': return <AdminDashboard />;
                case 'admin_users': return <AdminManageUsers />;
                case 'admin_modules': return <AdminManageModules />;
                case 'admin_quizzes': return <AdminManageQuizzes />;
                case 'admin_achievements': return <AdminManageAchievements />;
                case 'admin_gamification': return <AdminGamification />;
                case 'admin_stats': return <AdminStats />;
                case 'admin_tests': return <AdminTests />;
                case 'admin_diagnostics': return <AdminDiagnostics />;
                case 'admin_create_module': return <AdminCreateModule />;
                case 'admin_create_quiz': return <AdminCreateQuiz />;
                case 'admin_create_achievement': return <CreateAchievement />;
                case 'profile': return <Profile />;
                default: return <AdminDashboard />;
            }
        }

        if (userRole === 'direcao') {
            switch (currentPage) {
                case 'director_dashboard': return <DirectorDashboard />;
                case 'class_view': return <ClassView />;
                case 'teacher_statistics': return <TeacherStatistics />;
                case 'teacher_school_records': return <SchoolRecords />;
                case 'modules': return <Modules />;
                case 'module_view': return activeModule ? <ModuleViewPage /> : <Modules />;
                case 'profile': return <Profile />;
                default: return <DirectorDashboard />;
            }
        }

        if (userRole === 'secretaria') {
            switch (currentPage) {
                case 'secretariat_dashboard': return <SecretariatDashboard />;
                case 'secretariat_schools': return <SecretariatDashboard />;
                case 'profile': return <Profile />;
                default: return <SecretariatDashboard />;
            }
        }

        if (userRole === 'secretaria_estadual') {
            switch (currentPage) {
                case 'state_secretariat_dashboard': return <StateSecretariatDashboard />;
                case 'profile': return <Profile />;
                default: return <StateSecretariatDashboard />;
            }
        }

        if (userRole === 'responsavel') {
            switch (currentPage) {
                case 'guardian_dashboard': return <GuardianDashboard />;
                case 'profile': return <Profile />;
                default: return <GuardianDashboard />;
            }
        }

        if (userRole === 'professor') {
            switch (currentPage) {
                case 'dashboard': return <TeacherDashboard />; // Início = Simple Dashboard
                case 'teacher_dashboard': return <TeacherClassesList />; // Minhas Turmas = Full List
                case 'teacher_pending_activities': return <PendingActivities />;
                case 'modules': return <Modules />;
                case 'teacher_create_module': return <ModuleCreator />;
                case 'teacher_create_activity': return <CreateActivity />;
                case 'teacher_create_interactive_activity': return <CreateInteractiveActivity />; // NEW ROUTE
                case 'teacher_repository': return <TeacherRepository />;
                case 'teacher_module_repository': return <TeacherModuleRepository />;
                case 'teacher_statistics': return <TeacherStatistics />;
                case 'teacher_school_records': return <SchoolRecords />;
                case 'class_view': return <ClassView />;
                case 'teacher_grading_view': return gradingActivity ? <TeacherGradingView /> : <PendingActivities />;
                case 'profile': return <Profile />;
                case 'notifications': return <TeacherDashboard />;
                case 'module_view': return activeModule ? <ModuleViewPage /> : <Modules />;
                case 'interactive_map': return <InteractiveMap />;
                default: return <TeacherDashboard />;
            }
        }
        
        // Student Views
        switch (currentPage) {
            case 'dashboard': return <Dashboard />;
            case 'modules': return <Modules />;
            case 'quizzes': return <Quizzes />;
            case 'activities': return <Activities />;
            case 'achievements': return <Achievements />;
            case 'join_class': return <JoinClass />;
            case 'profile': return <Profile />;
            case 'notifications': return <NotificationsPage />;
            case 'boletim': return <Boletim />;
            case 'interactive_map': return <InteractiveMap />;
            case 'module_view': return activeModule ? <ModuleViewPage /> : <Modules />;
            case 'student_activity_view': return activeActivity ? <StudentActivityResponse /> : <Activities />;
            default: return <Dashboard />;
        }
    };
    
    let pageTitle = PAGE_TITLES[currentPage] || 'Lumen';
    // Override title for generic dashboard based on role to avoid confusion
    if (currentPage === 'dashboard') {
        pageTitle = 'Início';
    }
    
    if (currentPage === 'module_view' && activeModule) pageTitle = activeModule.title;
    if (currentPage === 'class_view' && activeClass) pageTitle = activeClass.name;

    useEffect(() => { document.title = `${pageTitle} - Lumen`; }, [pageTitle]);

    // Background Rendering Logic
    // Priority: User Wallpaper > Global Theme (Desktop/Mobile) > Gradient Fallback
    const hasGlobalTheme = globalTheme.desktop || globalTheme.mobile;
    const activeWallpaper = wallpaper; // Local user override

    // Focus Mode: Hide wallpaper on deep work states (Module, Quiz, Activity execution)
    // Only applied if enabled by user setting
    const isFocusMode = enableFocusMode && (
        currentPage === 'module_view' || 
        currentPage === 'student_activity_view' || 
        (currentPage === 'quizzes' && !!activeQuiz)
    );

    return (
        <div 
            className="relative flex h-screen overflow-hidden"
            style={{ backgroundColor: 'var(--bg-main)' }} 
        >
            <OfflineIndicator />
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-indigo-600 focus:rounded-md focus:shadow-lg transition-all">Pular para conteúdo</a>

            {/* Layer 1: Wallpaper Image (Disabled in Focus Mode) */}
            {!isFocusMode && activeWallpaper ? (
                <div className="absolute inset-0 z-0">
                    <img src={activeWallpaper} alt="" className="w-full h-full object-cover opacity-90" />
                </div>
            ) : !isFocusMode && hasGlobalTheme ? (
                <div className="absolute inset-0 z-0">
                    <picture>
                        {/* Mobile Source */}
                        {globalTheme.mobile && (
                            <source media="(max-width: 768px)" srcSet={globalTheme.mobile} />
                        )}
                        {/* Desktop/Fallback Source */}
                        <img 
                            src={globalTheme.desktop || globalTheme.mobile || ''} 
                            alt="" 
                            className="w-full h-full object-cover opacity-90" 
                        />
                    </picture>
                </div>
            ) : null}

            {/* Layer 2: Legibility Mask or Fallback Gradient */}
            <div 
                className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-700" 
                style={{ 
                    background: (!isFocusMode && (activeWallpaper || hasGlobalTheme))
                        ? (enableWallpaperMask 
                            ? 'linear-gradient(to top, var(--bg-main) 0%, rgba(var(--bg-main-rgb), 0.85) 60%, rgba(var(--bg-main-rgb), 0.4) 100%)' 
                            : 'transparent')
                        : 'linear-gradient(to bottom right, var(--bg-gradient-start), var(--bg-gradient-end))'
                }}
            />

            {/* Layer 3: Main Content */}
            <div className="relative z-10 flex h-full w-full">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Animated Hamburger Trigger */}
                    <button 
                        onClick={toggleMobileMenu} 
                        className={`fixed top-4 left-4 z-50 p-2.5 rounded-xl backdrop-blur-xl border transition-all duration-300 group ${
                            isMobileMenuOpen 
                                ? 'bg-red-500/10 border-red-500/30 text-red-400 rotate-90' 
                                : 'bg-[#0d1117]/60 border-white/10 text-slate-200 hover:bg-[#0d1117]/90 hover:border-brand/30 hover:text-brand'
                        }`}
                        aria-label={isMobileMenuOpen ? "Fechar Menu" : "Abrir Menu"}
                    >
                        <div className="relative w-5 h-4 flex flex-col justify-between overflow-hidden">
                            {/* Line 1 */}
                            <span className={`absolute top-0 left-0 w-full h-0.5 bg-current rounded-full transition-transform duration-300 origin-center ${isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : 'translate-y-0'}`} />
                            {/* Line 2 */}
                            <span className={`absolute top-[7px] left-0 w-full h-0.5 bg-current rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 translate-x-4' : 'opacity-100'}`} />
                            {/* Line 3 */}
                            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-current rounded-full transition-transform duration-300 origin-center ${isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : 'translate-y-0'}`} />
                        </div>
                    </button>

                    <Header title={pageTitle} isScrolled={isScrolled} />
                    <main id="main-content" ref={mainContentRef} className="flex-1 overflow-y-auto pb-6 sm:pb-8 lg:pb-10 pt-0 px-3 sm:px-4 lg:px-6 relative custom-scrollbar" tabIndex={-1} aria-label="Conteúdo principal">
                        <ErrorBoundary>
                            <Suspense fallback={<LoadingSpinner />}>
                                <div className="h-full w-full max-w-[1920px] mx-auto">{renderPage()}</div>
                            </Suspense>
                        </ErrorBoundary>
                    </main>
                </div>
            </div>
        </div>
    );
};

const AuthenticatedAppContent = () => {
    const { userRole } = useAuth();

    return (
        <NavigationProvider>
            {userRole === 'aluno' && (
                <StudentContextWrapper>
                    <MainLayout />
                </StudentContextWrapper>
            )}
            {(userRole === 'professor' || userRole === 'direcao') && (
                <TeacherContextWrapper>
                    <MainLayout />
                </TeacherContextWrapper>
            )}
            {(userRole === 'admin' || userRole === 'responsavel') && (
                <AdminContextWrapper>
                    <MainLayout />
                </AdminContextWrapper>
            )}
            {userRole === 'secretaria' && (
                <SecretariatContextWrapper>
                    <MainLayout />
                </SecretariatContextWrapper>
            )}
            {userRole === 'secretaria_estadual' && (
                <StateSecretariatContextWrapper>
                    <MainLayout />
                </StateSecretariatContextWrapper>
            )}
        </NavigationProvider>
    );
};

const AppContent = () => {
    const { authState, user, createUserProfile, authError } = useAuth();
    const [onboardingStep, setOnboardingStep] = useState<'role' | 'year'>('role');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [onboardingError, setOnboardingError] = useState<string | null>(null);

    if (authState === 'loading') return <LoadingSpinner />;
    
    if (authState === 'unauthenticated') {
        return (
            <>
                <OfflineIndicator />
                <LoginPage initialError={authError} />
            </>
        );
    }
    
    // Onboarding Logic
    if (user && !user.role) {
        const handleError = (e: any) => setOnboardingError(e.message);
        
        if (onboardingStep === 'role') {
            return <RoleSelectionPage error={onboardingError} onRoleSelected={async (role) => {
                setOnboardingError(null);
                if (role === 'aluno') {
                    setSelectedRole('aluno');
                    setOnboardingStep('year');
                } else {
                    try { await createUserProfile(role); } catch (e) { handleError(e); }
                }
            }} />;
        }
        return <YearSelectionPage error={onboardingError} onYearSelected={async (year) => {
            setOnboardingError(null);
            if (selectedRole) {
                try { await createUserProfile(selectedRole, year); } catch (e) { handleError(e); }
            }
        }} />;
    }

    return <AuthenticatedAppContent />;
};

const App = () => {
    return (
        <AppProviders>
            <DebugTools />
            <AppContent />
        </AppProviders>
    );
};

export default App;
