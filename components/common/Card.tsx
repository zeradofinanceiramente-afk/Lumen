
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
    return (
        <div 
            className={`glass-panel rounded-2xl p-6 hover:translate-y-[-2px] ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
};
