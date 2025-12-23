
import React, { useState, useEffect } from 'react';

export const ZoomControls: React.FC = () => {
    // State to track the current zoom scale factor
    const [scale, setScale] = useState(1);
    const [isOpen, setIsOpen] = useState(false);

    // Effect to set the initial scale based on the CSS variable when the component mounts
    useEffect(() => {
        const rootStyle = getComputedStyle(document.documentElement);
        const currentFontSize = rootStyle.getPropertyValue('--root-font-size').replace('px', '');
        if (currentFontSize && !isNaN(parseFloat(currentFontSize))) {
            setScale(parseFloat(currentFontSize) / 16); // Assuming 16px is the base
        }
    }, []);

    // Function to change the scale, clamped between 75% and 150%
    const changeScale = (delta: number) => {
        const nextScale = Math.min(1.5, Math.max(0.75, +(scale + delta).toFixed(2)));
        setScale(nextScale);
        document.documentElement.style.setProperty('--root-font-size', `${16 * nextScale}px`);
    };

    // Function to reset the scale to 100%
    const resetScale = () => {
        setScale(1);
        document.documentElement.style.setProperty('--root-font-size', '16px');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center justify-center w-10 h-10 bg-slate-100/10 hover:bg-slate-100/20 backdrop-blur-md border border-white/10 rounded-full text-slate-200 transition-all shadow-sm"
                aria-label="Abrir controles de zoom"
                title="Ajustar tamanho do texto"
            >
                <span className="text-lg font-bold">Aa</span>
            </button>
        );
    }

    return (
        <div 
            className="flex items-center space-x-1 bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-full p-1 shadow-xl animate-fade-in" 
            role="group" 
            aria-label="Controles de zoom"
        >
            <button 
                onClick={() => changeScale(-0.1)} 
                disabled={scale <= 0.75}
                className="w-8 h-8 rounded-full text-lg font-bold disabled:opacity-30 text-slate-200 hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label="Diminuir zoom"
            >
                -
            </button>
            <span 
                className="w-10 text-center text-xs font-mono font-semibold text-white/90 tabular-nums flex items-center justify-center"
                aria-live="polite"
            >
                {Math.round(scale * 100)}%
            </span>
            <button 
                onClick={() => changeScale(0.1)} 
                disabled={scale >= 1.5}
                className="w-8 h-8 rounded-full text-lg font-bold disabled:opacity-30 text-slate-200 hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label="Aumentar zoom"
            >
                +
            </button>
            <div className="w-px h-4 bg-white/20 mx-1"></div>
            <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 rounded-full text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label="Fechar controles de zoom"
            >
                ✕
            </button>
        </div>
    );
};
