
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
    return (
        <div className={`glass-panel rounded-2xl p-6 hover:translate-y-[-2px] ${className}`}>
            {children}
        </div>
    );
};
