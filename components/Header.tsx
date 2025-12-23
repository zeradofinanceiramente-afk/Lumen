
// FILE: components/Header.tsx
import React from 'react';
import { ICONS } from '../constants/index';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useStudentNotificationsContext } from '../contexts/StudentNotificationContext';
import { ZoomControls } from './common/ZoomControls';

interface HeaderProps {
    title: string;
    isScrolled: boolean;
}

// Wrapper component to safely use the hook only when the provider is present
const StudentNotificationButton: React.FC = () => {
    const { unreadNotificationCount } = useStudentNotificationsContext();
    const { setCurrentPage } = useNavigation();

    return (
        <button 
            onClick={() => setCurrentPage('notifications')} 
            className="relative text-slate-400 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors"
            aria-label={`Notificações (${unreadNotificationCount} não lidas)`}
        >
            <span aria-hidden="true">{ICONS.notifications}</span>
            {unreadNotificationCount > 0 && (
                <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-[#09090b]" aria-hidden="true">
                    {unreadNotificationCount}
                </span>
            )}
        </button>
    );
};

export const Header: React.FC<HeaderProps> = ({ title, isScrolled }) => {
    const { userRole } = useAuth();
    // Only show student specific components if the user is a student
    const isStudent = userRole === 'aluno';

    return (
        <header role="banner" className={`flex items-center justify-end relative flex-shrink-0 transition-all duration-300 ease-in-out ${isScrolled ? 'p-2 sm:p-3' : 'p-3 sm:p-4'} pointer-events-none`}>
            
            {/* Centered Title Container - Screen Reader Only */}
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                 <h1 id="page-main-heading" tabIndex={-1} className="sr-only">{title}</h1>
            </div>

            {/* Right-aligned Actions - Keep Visible and Interactive */}
            <div className={`flex items-center space-x-2 md:space-x-4 pointer-events-auto transition-all duration-300 ease-in-out ${isScrolled ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100'}`}>
                <div className="hidden sm:block">
                    <ZoomControls />
                </div>
                {isStudent && <StudentNotificationButton />}
            </div>
        </header>
    );
};
