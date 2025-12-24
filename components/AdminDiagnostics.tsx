
import React, { useEffect, useState, version as reactVersion } from 'react';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';

interface ImportMap {
    imports: Record<string, string>;
}

const AdminDiagnostics: React.FC = () => {
    const [envData, setEnvData] = useState<any>(null);

    useEffect(() => {
        analyzeEnvironment();
    }, []);

    const analyzeEnvironment = () => {
        const scriptMap = document.querySelector('script[type="importmap"]');
        let importMap: ImportMap | null = null;
        
        try {
            if (scriptMap && scriptMap.textContent) {
                importMap = JSON.parse(scriptMap.textContent);
            }
        } catch (e) {
            console.error("Erro ao ler ImportMap", e);
        }

        const reactEntry = importMap?.imports['react'] || 'Não encontrado no ImportMap';
        const reactDomEntry = importMap?.imports['react-dom/'] || 'Não encontrado no ImportMap';

        // Check for version pinning issues (using ^ or ~ in CDN links causes duplicates)
        const hasSemverRange = reactEntry.includes('@^') || reactEntry.includes('@~') || 
                               reactDomEntry.includes('@^') || reactDomEntry.includes('@~');

        setEnvData({
            reactVersionRuntime: reactVersion,
            importMap,
            reactEntry,
            reactDomEntry,
            hasSemverRange,
            userAgent: navigator.userAgent,
            onLine: navigator.onLine,
            // @ts-ignore
            memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB' : 'N/A'
        });
    };

    if (!envData) return <div className="p-8 text-center text-slate-500">Carregando diagnóstico...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                    <span className="mr-3 text-brand">{ICONS.diagnostics}</span>
                    Diagnóstico do Sistema
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Análise técnica do ambiente de execução (Environment Doctor).
                </p>
            </div>

            {envData.hasSemverRange ? (
                <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-xl text-red-200 shadow-lg">
                    <div className="flex items-start gap-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <h3 className="font-bold text-lg text-red-100">Alerta Crítico: Conflito de Versões Detectado</h3>
                            <p className="mt-1 text-sm text-red-200/80">
                                O ImportMap está utilizando versões dinâmicas (<code>^</code> ou <code>~</code>) para o React. 
                                Isso pode fazer com que o <code>react</code> e o <code>react-dom</code> carreguem instâncias diferentes da biblioteca, 
                                causando falhas graves em Hooks como <code>useRef</code> e <code>useState</code>.
                            </p>
                            <p className="mt-2 text-xs font-mono bg-black/30 p-2 rounded">
                                Recomendação: Remova o caractere '^' das URLs no index.html para fixar a versão exata.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl text-green-200 shadow-sm flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold">Ambiente Estável: Versões do React parecem consistentes.</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">
                        Runtime React
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Versão em Memória</p>
                            <code className="text-sm font-mono text-indigo-400">{envData.reactVersionRuntime}</code>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Origem (React Core)</p>
                            <code className="block bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs font-mono break-all text-slate-600 dark:text-slate-300">
                                {envData.reactEntry}
                            </code>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Origem (ReactDOM)</p>
                            <code className="block bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs font-mono break-all text-slate-600 dark:text-slate-300">
                                {envData.reactDomEntry}
                            </code>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 border-b dark:border-slate-700 pb-2">
                        Telemetria do Cliente
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700">
                            <span className="block text-xs text-slate-500 uppercase">Status da Rede</span>
                            <span className={`font-bold ${envData.onLine ? 'text-green-500' : 'text-red-500'}`}>
                                {envData.onLine ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700">
                            <span className="block text-xs text-slate-500 uppercase">Uso de Memória (JS Heap)</span>
                            <span className="font-bold text-indigo-400">{envData.memory}</span>
                        </div>
                        <div className="col-span-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700">
                            <span className="block text-xs text-slate-500 uppercase">User Agent</span>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{envData.userAgent}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="!p-0 overflow-hidden">
                <div className="p-4 bg-slate-100 dark:bg-slate-900 border-b dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">ImportMap Completo</h3>
                </div>
                <div className="p-0 bg-slate-50 dark:bg-[#0d1117]">
                    <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 p-4 overflow-x-auto">
                        {JSON.stringify(envData.importMap?.imports, null, 2)}
                    </pre>
                </div>
            </Card>
        </div>
    );
};

export default AdminDiagnostics;
