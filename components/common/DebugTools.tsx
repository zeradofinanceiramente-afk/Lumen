
import React, { useEffect, useRef } from 'react';

export const DebugTools: React.FC = () => {
    const loadedRef = useRef(false);

    useEffect(() => {
        // Verifica se o parâmetro existe na URL (ex: ?eruda=true ou ?debug=true)
        const params = new URLSearchParams(window.location.search);
        const shouldEnable = params.get('eruda') === 'true' || params.get('debug') === 'true';

        if (shouldEnable && !loadedRef.current) {
            loadedRef.current = true;
            
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/eruda";
            script.async = true;
            script.onload = () => {
                // @ts-ignore
                if (window.eruda) {
                    // @ts-ignore
                    window.eruda.init({
                        tool: ['console', 'elements', 'network', 'resources', 'info'],
                        defaults: {
                            displaySize: 50,
                            transparency: 0.9,
                            theme: 'Dracula' // Combina com o tema escuro do app
                        }
                    });
                    console.log("🛠️ Eruda Mobile Console Initialized");
                }
            };
            document.body.appendChild(script);
        }
    }, []);

    return null; // Este componente não renderiza nada visualmente por si só (o Eruda injeta seu próprio UI)
};
