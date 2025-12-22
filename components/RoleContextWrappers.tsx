
import React from 'react';
import { StudentAcademicProvider } from '../contexts/StudentAcademicContext';
import { StudentNotificationProvider } from '../contexts/StudentNotificationContext';
import { StudentGamificationProvider } from '../contexts/StudentGamificationContext';
import { TeacherClassProvider } from '../contexts/TeacherClassContext';
import { TeacherAcademicProvider } from '../contexts/TeacherAcademicContext';
import { TeacherCommunicationProvider } from '../contexts/TeacherCommunicationContext';
import { AdminDataProvider } from '../contexts/AdminDataContext';
import { SecretariatProvider } from '../contexts/SecretariatContext';
import { StateSecretariatProvider } from '../contexts/StateSecretariatContext';

interface WrapperProps {
    children: React.ReactNode;
}

export const StudentContextWrapper: React.FC<WrapperProps> = ({ children }) => (
    <StudentAcademicProvider>
        <StudentNotificationProvider>
            <StudentGamificationProvider>
                {children}
            </StudentGamificationProvider>
        </StudentNotificationProvider>
    </StudentAcademicProvider>
);

export const TeacherContextWrapper: React.FC<WrapperProps> = ({ children }) => (
    <TeacherClassProvider>
        <TeacherAcademicProvider>
            <TeacherCommunicationProvider>
                {children}
            </TeacherCommunicationProvider>
        </TeacherAcademicProvider>
    </TeacherClassProvider>
);

export const AdminContextWrapper: React.FC<WrapperProps> = ({ children }) => (
    <AdminDataProvider>
        {children}
    </AdminDataProvider>
);

export const SecretariatContextWrapper: React.FC<WrapperProps> = ({ children }) => (
    <SecretariatProvider>
        {children}
    </SecretariatProvider>
);

export const StateSecretariatContextWrapper: React.FC<WrapperProps> = ({ children }) => (
    <StateSecretariatProvider>
        {children}
    </StateSecretariatProvider>
);
