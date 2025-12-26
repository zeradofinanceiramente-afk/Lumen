
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useStudentAcademic } from '../contexts/StudentAcademicContext';
import { useSettings } from '../contexts/SettingsContext';
import type { Activity, ActivityItem, ActivitySubmission } from '../types';
import { SpinnerIcon } from '../constants/index';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { useToast } from '../contexts/ToastContext';
import { storage } from './firebaseStorage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Lazy Load Complex Activities
const VisualSourceAnalysis = React.lazy(() => import('./activities/VisualSourceAnalysis').then(m => ({ default: m.VisualSourceAnalysis })));
const ConceptConnection = React.lazy(() => import('./activities/ConceptConnection').then(m => ({ default: m.ConceptConnection })));
const AdvanceOrganizer = React.lazy(() => import('./activities/AdvanceOrganizer').then(m => ({ default: m.AdvanceOrganizer })));
const ProgressiveTree = React.lazy(() => import('./activities/ProgressiveTree').then(m => ({ default: m.ProgressiveTree })));
const IntegrativeDragDrop = React.lazy(() => import('./activities/IntegrativeDragDrop').then(m => ({ default: m.IntegrativeDragDrop })));
const RoleplayScenario = React.lazy(() => import('./activities/RoleplayScenario').then(m => ({ default: m.RoleplayScenario })));

// --- SHARED TYPES ---
interface LayoutProps {
    activity: Activity;
    items: ActivityItem[];
    answers: Record<string, string>;
    handleAnswerChange: (id: string, val: string) => void;
    uploadedFiles: File[];
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isSubmitting: boolean;
    handleSubmit: () => void;
    onBack: () => void;
    renderComplexContent: () => React.ReactNode;
    isSubmitted: boolean;
    submission?: ActivitySubmission;
}

// ============================================================================
// 1. LAYOUT: RESTLESS DREAMS (INVESTIGATIVE DOSSIER)
// Estética: Documento antigo, máquina de escrever, horror analógico.
// ============================================================================
const RestlessLayout: React.FC<LayoutProps> = ({ 
    activity, items, answers, handleAnswerChange, 
    handleSubmit, isSubmitting, onBack, renderComplexContent, isSubmitted, submission 
}) => {
    return (
        <div className="min-h-screen bg-[#0c0a09] font-typewriter text-stone-400 relative overflow-hidden selection:bg-[#7f1d1d] selection:text-white pb-32">
            {/* Atmosphere Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-20 mix-blend-overlay"></div>
            <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_120%)]"></div>
            
            <div className="relative z-10 max-w-3xl mx-auto p-8 md:p-12">
                {/* Header "Documento Confidencial" */}
                <div className="border-b-2 border-stone-800 pb-6 mb-12 flex justify-between items-end">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-[#7f1d1d] mb-2">Arquivo Nº {activity.id.slice(0,6)}</p>
                        <h1 className="text-3xl md:text-4xl font-bold text-stone-200 tracking-tighter">{activity.title}</h1>
                    </div>
                    <button onClick={onBack} className="text-xs uppercase hover:text-[#7f1d1d] transition-colors hover:underline decoration-1 underline-offset-4">
                        [ Fechar Dossiê ]
                    </button>
                </div>

                <div className="mb-12 text-sm leading-relaxed text-stone-500 italic border-l border-stone-800 pl-4">
                    {activity.description}
                </div>

                {isSubmitted ? (
                    <div className="border-2 border-dashed border-stone-800 p-8 text-center relative">
                        <div className="absolute top-4 right-4 transform rotate-12 border-4 border-[#7f1d1d] text-[#7f1d1d] px-4 py-2 text-xl font-bold uppercase opacity-80">
                            Arquivado
                        </div>
                        <p className="text-stone-500">Este relatório foi submetido e lacrado.</p>
                        {submission?.feedback && (
                            <div className="mt-6 text-left font-handwriting text-stone-300">
                                <p className="text-xs uppercase text-stone-600 mb-1">Notas do Supervisor:</p>
                                "{submission.feedback}"
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Conteúdo Complexo (Imagens, etc) */}
                        <div className="mb-12 grayscale contrast-125 sepia-[.3]">
                            {renderComplexContent()}
                        </div>

                        {/* Formulário Estilo "Preencher Lacunas" */}
                        <div className="space-y-12">
                            {items.map((item, idx) => (
                                <div key={item.id} className="relative group">
                                    <div className="absolute -left-8 top-0 text-stone-700 font-bold">{idx + 1}.</div>
                                    <p className="text-stone-300 mb-4 text-lg">{item.question}</p>
                                    
                                    {item.type === 'text' ? (
                                        <div className="relative">
                                            <textarea
                                                rows={4}
                                                className="w-full bg-transparent border-b border-stone-800 text-stone-300 focus:border-[#7f1d1d] focus:outline-none transition-colors resize-none text-base leading-relaxed placeholder:text-stone-800"
                                                placeholder="// Registre suas observações aqui..."
                                                value={answers[item.id] || ''}
                                                onChange={e => handleAnswerChange(item.id, e.target.value)}
                                            />
                                            {/* Efeito de sujeira/ruído no input */}
                                            <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 pl-4 border-l border-stone-800">
                                            {item.options?.map(opt => {
                                                const isChecked = answers[item.id] === opt.id;
                                                return (
                                                    <label key={opt.id} className="flex items-center gap-3 cursor-pointer group/opt">
                                                        <div className={`w-4 h-4 border border-stone-600 flex items-center justify-center transition-all ${isChecked ? 'bg-[#7f1d1d] border-[#7f1d1d]' : 'group-hover/opt:border-stone-400'}`}>
                                                            {isChecked && <span className="text-black text-[10px]">✕</span>}
                                                        </div>
                                                        <input 
                                                            type="radio" 
                                                            name={`q-${item.id}`} 
                                                            className="hidden" 
                                                            checked={isChecked}
                                                            onChange={() => handleAnswerChange(item.id, opt.id)}
                                                        />
                                                        <span className={`${isChecked ? 'text-[#7f1d1d] line-through decoration-1 decoration-stone-600' : 'text-stone-500 group-hover/opt:text-stone-300'}`}>
                                                            {opt.text}
                                                        </span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-16 border-t-2 border-stone-800 pt-8 flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-[#1c1917] text-[#7f1d1d] font-bold uppercase tracking-widest border border-stone-800 hover:bg-[#292524] hover:border-[#7f1d1d] transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Transmitindo...' : 'Selar e Enviar'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// 2. LAYOUT: THE SCHOLAR (THEME: PAPER)
// Estética: Dark Academia, Pergaminho, Mesa de madeira, Iluminação quente.
// ============================================================================
const ScholarLayout: React.FC<LayoutProps> = ({ 
    activity, items, answers, handleAnswerChange, 
    handleSubmit, isSubmitting, onBack, renderComplexContent, isSubmitted, submission 
}) => {
    return (
        <div className="min-h-screen bg-[#1c1917] font-serif text-[#292524] pb-32 relative">
            {/* Wooden/Dark Texture Background */}
            <div className="fixed inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
            
            <div className="relative z-10 max-w-4xl mx-auto pt-10 px-4">
                {/* Back Button - styled like a bookmark */}
                <button onClick={onBack} className="absolute left-0 top-10 -ml-16 bg-red-800 text-red-100 px-4 py-8 rounded-l-md font-bold tracking-widest writing-vertical-lr hover:bg-red-900 transition-colors shadow-lg hidden xl:block">
                    VOLTAR
                </button>
                <button onClick={onBack} className="xl:hidden mb-4 text-[#a8a29e] hover:text-white font-bold">
                    &larr; Voltar
                </button>

                {/* Main Paper Sheet */}
                <div className="bg-[#e7e5e4] shadow-[0_0_50px_rgba(0,0,0,0.5)] min-h-[80vh] p-8 md:p-16 relative mx-auto max-w-3xl transform rotate-[0.5deg]">
                    {/* Paper Texture Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-50 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
                    
                    <div className="relative z-20">
                        <div className="border-b-2 border-[#292524] pb-4 mb-8 flex justify-between items-end">
                            <h1 className="text-4xl font-black tracking-tight text-[#292524]">{activity.title}</h1>
                            <span className="font-mono text-sm text-[#57534e]">{activity.points} Pts</span>
                        </div>

                        <p className="text-lg leading-relaxed text-[#44403c] mb-12 font-medium italic border-l-4 border-[#a8a29e] pl-6">
                            {activity.description}
                        </p>

                        <div className="mb-12">
                            {renderComplexContent()}
                        </div>

                        {isSubmitted ? (
                            <div className="bg-[#f5f5f4] border border-[#d6d3d1] p-8 text-center">
                                <div className="text-4xl text-green-700 mb-2">✦</div>
                                <h3 className="text-xl font-bold text-[#292524]">Atividade Registrada</h3>
                                <p className="text-[#57534e]">Suas respostas foram arquivadas na biblioteca.</p>
                                {submission?.feedback && (
                                    <div className="mt-6 p-4 bg-[#fff] border border-[#e7e5e4] text-left font-handwriting text-lg text-[#292524] shadow-sm rotate-1">
                                        <p className="text-xs uppercase text-[#a8a29e] font-sans font-bold mb-2">Nota do Professor:</p>
                                        "{submission.feedback}"
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {items.map((item, idx) => (
                                    <div key={item.id}>
                                        <div className="flex items-baseline gap-2 mb-4">
                                            <span className="font-black text-2xl text-[#292524]">{idx + 1}.</span>
                                            <p className="text-lg font-bold text-[#44403c]">{item.question}</p>
                                        </div>

                                        {item.type === 'text' ? (
                                            <div className="relative">
                                                {/* Lined Paper Effect */}
                                                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#d6d3d1 1px, transparent 1px)', backgroundSize: '100% 2rem', marginTop: '1.9rem' }}></div>
                                                <textarea 
                                                    rows={6}
                                                    className="w-full bg-transparent border-none text-lg leading-[2rem] text-[#292524] focus:ring-0 resize-y pl-2 font-medium"
                                                    value={answers[item.id] || ''}
                                                    onChange={e => handleAnswerChange(item.id, e.target.value)}
                                                    placeholder="Escreva sua resposta..."
                                                />
                                            </div>
                                        ) : (
                                            <div className="space-y-3 pl-8">
                                                {item.options?.map(opt => {
                                                    const isChecked = answers[item.id] === opt.id;
                                                    return (
                                                        <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                                                            <div className={`w-5 h-5 rounded-full border-2 border-[#57534e] flex items-center justify-center transition-all ${isChecked ? 'bg-[#292524] border-[#292524]' : 'group-hover:border-[#292524]'}`}>
                                                                {isChecked && <div className="w-2 h-2 rounded-full bg-[#e7e5e4]" />}
                                                            </div>
                                                            <span className={`text-lg ${isChecked ? 'font-bold text-[#292524]' : 'text-[#57534e] group-hover:text-[#292524]'}`}>
                                                                {opt.text}
                                                            </span>
                                                            <input type="radio" name={`q-${item.id}`} className="hidden" checked={isChecked} onChange={() => handleAnswerChange(item.id, opt.id)} />
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="pt-8 border-t-2 border-[#292524] mt-12 flex justify-center">
                                    <button 
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="bg-[#292524] text-[#e7e5e4] px-10 py-3 font-bold text-lg tracking-widest hover:bg-[#000] transition-colors shadow-lg"
                                    >
                                        {isSubmitting ? 'Arquivando...' : 'Finalizar Escrita'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 3. LAYOUT: THE CONSTRUCT (THEME: MATRIX)
// Estética: Brutalista, Terminal, ASCII, Verde Fósforo, Fundo Preto Absoluto.
// ============================================================================
const TerminalLayout: React.FC<LayoutProps> = ({ 
    activity, items, answers, handleAnswerChange, 
    handleSubmit, isSubmitting, onBack, renderComplexContent, isSubmitted, submission 
}) => {
    return (
        <div className="min-h-screen bg-black font-mono text-green-500 p-4 md:p-8 overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            
            {/* Scanline Effect */}
            <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20"></div>

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="mb-8 border-b border-green-900 pb-2 flex justify-between items-end">
                    <div>
                        <p className="text-xs text-green-800 mb-1">root@lumen:~# ./start_activity.sh --id={activity.id}</p>
                        <h1 className="text-2xl md:text-3xl font-bold text-green-400 uppercase glitch-text" data-text={activity.title}>{activity.title}</h1>
                    </div>
                    <button onClick={onBack} className="text-green-700 hover:text-green-400 hover:bg-green-900/20 px-2 py-1 uppercase text-xs font-bold transition-colors">
                        [ ABORT ]
                    </button>
                </div>

                <div className="mb-8 text-green-600 text-sm border-l-2 border-green-800 pl-4 py-2">
                    <span className="text-green-800 font-bold mr-2">&gt;&gt;</span>
                    {activity.description}
                </div>

                <div className="mb-8 border border-green-900 p-2">
                    <div className="bg-black border-b border-green-900 mb-2 px-2 py-1 text-xs text-green-800 uppercase">Interactive_Module_Render</div>
                    {renderComplexContent()}
                </div>

                {isSubmitted ? (
                    <div className="border border-green-500 p-6 text-center animate-pulse">
                        <h2 className="text-xl font-bold mb-2">UPLOAD_COMPLETE</h2>
                        <p className="text-sm text-green-700">Data synchronized with mainframe.</p>
                        {submission?.feedback && (
                            <div className="mt-4 text-left border-t border-green-900 pt-4">
                                <p className="text-xs text-green-800 uppercase mb-1">admin_response:</p>
                                <p className="text-green-400">"{submission.feedback}"</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-10">
                        {items.map((item, idx) => (
                            <div key={item.id} className="group">
                                <div className="flex gap-2 mb-2">
                                    <span className="text-green-700">[{String(idx).padStart(2, '0')}]</span>
                                    <p className="font-bold text-green-300">{item.question}</p>
                                </div>

                                {item.type === 'text' ? (
                                    <div className="flex gap-2">
                                        <span className="text-green-500 mt-1">&gt;</span>
                                        <textarea 
                                            rows={3}
                                            className="w-full bg-black border-none text-green-400 focus:ring-0 p-0 resize-y font-mono placeholder-green-900"
                                            placeholder="..."
                                            value={answers[item.id] || ''}
                                            onChange={e => handleAnswerChange(item.id, e.target.value)}
                                        />
                                        <span className="animate-pulse bg-green-500 w-2 h-5 mt-1 block"></span>
                                    </div>
                                ) : (
                                    <div className="pl-8 space-y-1">
                                        {item.options?.map(opt => {
                                            const isChecked = answers[item.id] === opt.id;
                                            return (
                                                <button 
                                                    key={opt.id}
                                                    onClick={() => handleAnswerChange(item.id, opt.id)}
                                                    className="block w-full text-left hover:bg-green-900/20 px-2 py-1 transition-colors"
                                                >
                                                    <span className={isChecked ? "text-green-400 font-bold" : "text-green-800"}>
                                                        {isChecked ? "(X)" : "( )"} {opt.text}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="pt-8 border-t border-green-900">
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full border border-green-500 text-green-500 hover:bg-green-500 hover:text-black py-3 font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'UPLOADING_PACKETS...' : 'EXECUTE_SUBMISSION'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// 4. LAYOUT: M.A.G.I. (THEME: EVA)
// Estética: Hexágonos, Laranja/Roxo, Interface Tática, Alertas.
// ============================================================================
const MagiLayout: React.FC<LayoutProps> = ({ 
    activity, items, answers, handleAnswerChange, 
    handleSubmit, isSubmitting, onBack, renderComplexContent, isSubmitted, submission 
}) => {
    return (
        <div className="min-h-screen bg-[#2e1065] font-sans text-orange-500 p-2 md:p-6 overflow-x-hidden pb-32">
            <div className="max-w-5xl mx-auto border-2 border-orange-500 bg-black/80 shadow-[0_0_30px_rgba(249,115,22,0.3)] relative">
                
                {/* Decorative Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 -mb-1 -mr-1"></div>

                {/* Header */}
                <div className="bg-orange-500 text-black p-2 flex justify-between items-center font-black uppercase tracking-tighter">
                    <span className="text-2xl">EMERGENCY MODE</span>
                    <div className="flex gap-2">
                        <span className="bg-black text-orange-500 px-2">CODE: {activity.id.slice(0,3)}</span>
                        <button onClick={onBack} className="bg-black text-orange-500 px-4 hover:bg-orange-900 transition-colors">EXIT</button>
                    </div>
                </div>

                <div className="p-6 md:p-10 relative">
                    {/* Hexagonal Grid Background Overlay */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                    
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Info Panel */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="border border-orange-500/50 p-4 bg-orange-900/10">
                                <h1 className="text-3xl font-black text-orange-500 leading-none mb-2">{activity.title}</h1>
                                <div className="h-2 w-full bg-orange-500/30 mb-4 overflow-hidden">
                                    <div className="h-full bg-orange-500 w-2/3 animate-pulse"></div>
                                </div>
                                <p className="text-orange-300 text-xs font-mono leading-tight">{activity.description}</p>
                            </div>
                            
                            <div className="border border-purple-500 p-1 bg-purple-900/20">
                                <div className="bg-black/50 p-2">
                                    <span className="text-purple-400 text-xs font-bold uppercase block mb-1">Tactical Map</span>
                                    {renderComplexContent()}
                                </div>
                            </div>
                        </div>

                        {/* Interaction Panel */}
                        <div className="lg:col-span-8">
                            {isSubmitted ? (
                                <div className="flex flex-col items-center justify-center h-full border-2 border-green-500 bg-green-900/20 p-8">
                                    <h2 className="text-4xl font-black text-green-500 mb-4">SUCCESS</h2>
                                    <p className="text-green-300 font-mono">Operations concluded.</p>
                                    {submission?.feedback && (
                                        <div className="mt-6 border-t border-green-500/50 pt-4 w-full">
                                            <p className="text-green-600 font-bold uppercase text-xs">MAGI_SYSTEM_REPORT:</p>
                                            <p className="text-green-200 text-sm">{submission.feedback}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {items.map((item, idx) => (
                                        <div key={item.id} className="border-l-4 border-orange-500 pl-4 py-2 bg-gradient-to-r from-orange-900/10 to-transparent">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="bg-orange-500 text-black font-bold px-2 text-xs">Q-{idx + 1}</span>
                                                <span className="text-orange-100 font-bold">{item.question}</span>
                                            </div>

                                            {item.type === 'text' ? (
                                                <textarea 
                                                    className="w-full bg-black/60 border border-orange-500/30 text-orange-200 p-3 focus:border-orange-500 outline-none font-mono text-sm"
                                                    rows={3}
                                                    value={answers[item.id] || ''}
                                                    onChange={e => handleAnswerChange(item.id, e.target.value)}
                                                />
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {item.options?.map(opt => {
                                                        const isChecked = answers[item.id] === opt.id;
                                                        return (
                                                            <button 
                                                                key={opt.id}
                                                                onClick={() => handleAnswerChange(item.id, opt.id)}
                                                                className={`p-3 text-left text-xs font-bold uppercase border transition-all ${
                                                                    isChecked 
                                                                    ? 'bg-orange-500 text-black border-orange-500' 
                                                                    : 'bg-black border-orange-500/30 text-orange-400 hover:bg-orange-900/30'
                                                                }`}
                                                            >
                                                                {opt.text}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <button 
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-xl py-4 clip-path-polygon shadow-[5px_5px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all"
                                        style={{ clipPath: 'polygon(5% 0, 100% 0, 100% 80%, 95% 100%, 0 100%, 0 20%)' }}
                                    >
                                        {isSubmitting ? 'SYNCING...' : 'INITIATE UPLOAD'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 5. LAYOUT: CYBER HUD (LIMITLESS / NEBULA / REPOSITORY)
// Estética: Interface Sci-Fi, Glassmorphism, Grid, Tech.
// ============================================================================
const CyberLayout: React.FC<LayoutProps> = ({ 
    activity, items, answers, handleAnswerChange, 
    handleSubmit, isSubmitting, onBack, renderComplexContent, isSubmitted, submission 
}) => {
    return (
        <div className="min-h-screen bg-[#050505] font-sans text-blue-100 relative overflow-hidden flex flex-col">
            {/* Cyber Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,210,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-0"></div>
            
            {/* Top HUD Bar */}
            <div className="relative z-20 h-16 border-b border-blue-500/20 bg-[#0a0a1a]/80 backdrop-blur-md flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 border border-blue-500/30 rounded hover:bg-blue-500/20 transition-all text-blue-400">
                        &lt; BACK
                    </button>
                    <div className="h-8 w-[1px] bg-blue-500/20"></div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-widest uppercase">{activity.title}</h1>
                        <div className="flex items-center gap-2 text-[10px] text-blue-400 font-mono">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            SYSTEM_ONLINE // PROTOCOL_V2
                        </div>
                    </div>
                </div>
                <div className="font-mono text-blue-300 text-xs border border-blue-500/30 px-3 py-1 rounded bg-blue-900/10">
                    XP_REWARD: {activity.points}
                </div>
            </div>

            <div className="flex-1 relative z-10 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
                {/* Left Panel: Description & Context */}
                <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                    <div className="bg-[#0a0a1a]/60 border border-blue-500/20 p-6 rounded-lg backdrop-blur-sm shadow-[0_0_20px_rgba(0,210,255,0.05)]">
                        <h3 className="text-xs font-bold text-blue-500 uppercase mb-4 flex items-center gap-2">
                            <span className="text-lg">ℹ</span> Mission Brief
                        </h3>
                        <p className="text-sm text-blue-100/80 leading-relaxed font-light">
                            {activity.description}
                        </p>
                    </div>
                    
                    {/* Render Complex Content inside a HUD Frame */}
                    <div className="bg-black border border-blue-500/10 rounded-lg overflow-hidden relative">
                        <div className="absolute top-2 right-2 text-[8px] text-blue-500 font-mono">VISUAL_FEED</div>
                        {renderComplexContent()}
                    </div>
                </div>

                {/* Right Panel: Input Terminal */}
                <div className="lg:col-span-8 bg-[#0a0a1a]/80 border-x border-blue-500/10 relative flex flex-col">
                    {/* Decorative Corner Lines */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500"></div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {isSubmitted ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 border-4 border-green-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-[0_0_30px_rgba(34,197,94,0.4)] text-green-500">
                                    ✓
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">TRANSMISSION COMPLETE</h2>
                                <p className="text-blue-300/60 font-mono text-sm">Data log archived successfully.</p>
                                {submission?.feedback && (
                                    <div className="mt-8 bg-blue-900/20 border border-blue-500/30 p-4 rounded text-left max-w-md w-full">
                                        <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Incoming Message:</p>
                                        <p className="text-sm text-blue-100">{submission.feedback}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {items.map((item, idx) => (
                                    <div key={item.id} className="animate-slide-in" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-mono px-2 py-1 rounded">
                                                IN_{String(idx + 1).padStart(2, '0')}
                                            </span>
                                            <h3 className="text-white font-medium">{item.question}</h3>
                                        </div>

                                        {item.type === 'text' ? (
                                            <textarea
                                                rows={3}
                                                className="w-full bg-[#050505] border border-blue-500/30 rounded p-4 text-sm text-blue-100 focus:border-blue-400 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] outline-none transition-all font-mono"
                                                placeholder="> Input data stream..."
                                                value={answers[item.id] || ''}
                                                onChange={e => handleAnswerChange(item.id, e.target.value)}
                                            />
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {item.options?.map(opt => {
                                                    const isChecked = answers[item.id] === opt.id;
                                                    return (
                                                        <button 
                                                            key={opt.id}
                                                            onClick={() => handleAnswerChange(item.id, opt.id)}
                                                            className={`p-3 rounded border text-left text-sm transition-all relative overflow-hidden ${
                                                                isChecked 
                                                                ? 'bg-blue-500/20 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                                                                : 'bg-[#050505] border-blue-500/20 text-blue-300/70 hover:border-blue-500/50 hover:bg-blue-500/5'
                                                            }`}
                                                        >
                                                            {isChecked && <div className="absolute inset-0 bg-blue-400/10 animate-pulse"></div>}
                                                            {opt.text}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {!isSubmitted && (
                        <div className="p-6 border-t border-blue-500/10 bg-[#0a0a1a]/90 backdrop-blur flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest rounded clip-path-slant transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                            >
                                {isSubmitting ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : 'EXECUTE'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 6. LAYOUT: STANDARD STACK (DEFAULT / OLED / SITH / REPO STYLE: GITHUB)
// Estética: GitHub Issues / Dark Mode Clean / Tech Documentation.
// ============================================================================
const StandardLayout: React.FC<LayoutProps> = ({ 
    activity, items, answers, handleAnswerChange, 
    handleSubmit, isSubmitting, onBack, renderComplexContent, isSubmitted, submission, uploadedFiles, handleFileSelect 
}) => {
    return (
        <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans pb-32">
            <div className="max-w-6xl mx-auto pt-6 px-4 md:px-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#30363d] pb-6">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-[#8b949e] mb-2">
                            <span className="cursor-pointer hover:text-[#58a6ff] underline-offset-2 hover:underline" onClick={onBack}>{activity.materia || 'Disciplina'}</span>
                            <span>/</span>
                            <span className="font-semibold text-white">{activity.title}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-3">
                            {activity.title} <span className="text-[#8b949e] font-light text-2xl">#{activity.id.slice(0, 4)}</span>
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 ${isSubmitted ? 'bg-[#8957e5]/10 text-[#d2a8ff] border-[#8957e5]/30' : 'bg-[#238636]/10 text-[#3fb950] border-[#238636]/30'}`}>
                                {isSubmitted ? (
                                    <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg> Merged (Enviado)</>
                                ) : (
                                    <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg> Open (Pendente)</>
                                )}
                            </span>
                            <span className="text-[#8b949e]">
                                {activity.creatorName || 'Professor'} abriu esta atividade {activity.dueDate ? `• Prazo: ${new Date(activity.dueDate).toLocaleDateString()}` : ''}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Context / README */}
                    <div className="lg:col-span-9 space-y-6">
                        {/* Description Box (README style) */}
                        <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
                            <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between sticky top-0 z-10">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#8b949e]" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 1 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5v-9Zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 0 1 1-1h8ZM5 12.25v3.25a.25.25 0 0 0 .4.2l1.45-1.087a.25.25 0 0 1 .3 0L8.6 15.7a.25.25 0 0 0 .4-.2v-3.25a.25.25 0 0 0-.25-.25h-3.5a.25.25 0 0 0-.25.25Z"></path></svg>
                                    <span className="text-xs font-bold text-[#c9d1d9] font-mono">README.md</span>
                                </div>
                            </div>
                            <div className="p-6 md:p-8">
                                <div className="prose prose-invert max-w-none prose-sm md:prose-base prose-pre:bg-[#161b22] prose-pre:border prose-pre:border-[#30363d]">
                                    <p>{activity.description}</p>
                                    {renderComplexContent()}
                                </div>
                            </div>
                        </div>

                        {/* Questions Flow (Timeline style) */}
                        <div className="relative pl-0 md:pl-4 pt-4">
                            {/* Vertical Line */}
                            <div className="absolute left-4 md:left-12 top-0 bottom-0 w-0.5 bg-[#30363d] hidden md:block"></div>

                            {items.map((item, idx) => (
                                <div key={item.id} className="relative mb-8 md:pl-20">
                                    {/* Timeline Icon */}
                                    <div className="absolute left-8 top-0 w-8 h-8 bg-[#21262d] border border-[#30363d] rounded-full flex items-center justify-center z-10 hidden md:flex text-[#8b949e]">
                                        <span className="text-xs font-bold">{idx + 1}</span>
                                    </div>

                                    {/* Question Box */}
                                    <div className="border border-[#30363d] rounded-md bg-[#0d1117] relative">
                                        {/* Pointy bit for comment bubble look */}
                                        <div className="absolute top-3 -left-1.5 w-3 h-3 bg-[#161b22] border-l border-t border-[#30363d] transform -rotate-45 hidden md:block"></div>

                                        <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] rounded-t-md flex justify-between items-center">
                                            <span className="text-sm font-semibold text-[#c9d1d9]">Questão {idx + 1}</span>
                                            <span className="text-xs text-[#8b949e] border border-[#30363d] px-2 py-0.5 rounded-full">{item.points} pts</span>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-[#c9d1d9] mb-4 text-sm md:text-base font-medium leading-relaxed">{item.question}</p>
                                            
                                            {!isSubmitted ? (
                                                item.type === 'text' ? (
                                                    <div className="relative">
                                                        <textarea
                                                            rows={4}
                                                            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-sm text-[#c9d1d9] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] outline-none transition-all placeholder-[#484f58] font-mono resize-y min-h-[100px]"
                                                            placeholder="Escreva sua resposta..."
                                                            value={answers[item.id] || ''}
                                                            onChange={e => handleAnswerChange(item.id, e.target.value)}
                                                        />
                                                        <div className="absolute bottom-2 right-2 text-[10px] text-[#484f58] pointer-events-none">Markdown supported</div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {item.options?.map(opt => (
                                                            <label key={opt.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-[#161b22] cursor-pointer border border-transparent hover:border-[#30363d] transition-all group">
                                                                <input 
                                                                    type="radio" 
                                                                    name={`q-${item.id}`}
                                                                    className="appearance-none w-4 h-4 rounded-full border border-[#30363d] bg-[#0d1117] checked:bg-[#1f6feb] checked:border-[#1f6feb] focus:ring-0 focus:ring-offset-0 checked:after:content-[''] checked:after:block checked:after:w-1.5 checked:after:h-1.5 checked:after:rounded-full checked:after:bg-white checked:after:m-auto checked:after:mt-[3px] group-hover:border-[#8b949e]"
                                                                    checked={answers[item.id] === opt.id}
                                                                    onChange={() => handleAnswerChange(item.id, opt.id)}
                                                                />
                                                                <span className="text-sm text-[#c9d1d9] group-hover:text-[#58a6ff] transition-colors">{opt.text}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )
                                            ) : (
                                                <div className="p-3 bg-[#161b22] rounded border border-[#30363d] text-sm text-[#8b949e] font-mono">
                                                    {item.type === 'multiple_choice' 
                                                        ? item.options?.find(o => o.id === answers[item.id])?.text || 'Sem resposta'
                                                        : answers[item.id] || 'Sem resposta'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* File Upload Section */}
                            {activity.allowFileUpload && !isSubmitted && (
                                <div className="relative mb-8 md:pl-20">
                                    <div className="absolute left-8 top-0 w-8 h-8 bg-[#21262d] border border-[#30363d] rounded-full flex items-center justify-center z-10 hidden md:flex text-[#8b949e]">
                                        <span className="text-xs font-bold">📎</span>
                                    </div>
                                    <div className="border border-[#30363d] rounded-md bg-[#0d1117] relative">
                                        <div className="absolute top-3 -left-1.5 w-3 h-3 bg-[#0d1117] border-l border-t border-[#30363d] transform -rotate-45 hidden md:block"></div>
                                        <div className="p-4">
                                            <h3 className="text-sm font-semibold text-[#c9d1d9] mb-2">Anexar Arquivos</h3>
                                            <div className="border border-dashed border-[#30363d] rounded-md p-8 text-center hover:bg-[#161b22] hover:border-[#8b949e] transition-all cursor-pointer relative bg-[#0d1117]">
                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    onChange={handleFileSelect} 
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <p className="text-sm text-[#c9d1d9] font-medium">Arraste arquivos aqui ou clique para selecionar.</p>
                                                <p className="text-xs text-[#8b949e] mt-1">Imagens, documentos ou PDFs.</p>
                                                {uploadedFiles.length > 0 && (
                                                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                                        {uploadedFiles.map((f, i) => (
                                                            <span key={i} className="text-xs bg-[#1f6feb]/20 text-[#58a6ff] px-2 py-1 rounded border border-[#1f6feb]/40 flex items-center gap-1">
                                                                📄 {f.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submission Area */}
                        {!isSubmitted && (
                            <div className="md:pl-20 border-t border-[#30363d] pt-6 flex justify-end gap-3">
                                <button 
                                    onClick={onBack}
                                    className="px-4 py-2 bg-[#21262d] text-[#c9d1d9] text-sm font-semibold rounded-md border border-[#30363d] hover:bg-[#30363d] hover:border-[#8b949e] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-[#238636] text-white text-sm font-bold rounded-md hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting && <SpinnerIcon className="w-4 h-4 animate-spin text-white" />}
                                    {isSubmitting ? 'Enviando...' : 'Finalizar Atividade'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
                            <div className="p-4 border-b border-[#30363d] bg-[#161b22]">
                                <h3 className="text-xs font-bold text-[#c9d1d9] uppercase">Detalhes</h3>
                            </div>
                            <div className="p-4 space-y-4 text-sm text-[#8b949e]">
                                <div className="flex justify-between items-center pb-3 border-b border-[#30363d]">
                                    <span>Status</span>
                                    <span className={isSubmitted ? "text-[#a371f7]" : "text-[#3fb950]"}>{isSubmitted ? 'Concluído' : 'Pendente'}</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-[#30363d]">
                                    <span>Prazo</span>
                                    <span className="text-[#c9d1d9]">{activity.dueDate ? new Date(activity.dueDate).toLocaleDateString() : 'Sem prazo'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Pontos</span>
                                    <span className="text-[#c9d1d9]">{activity.points} XP</span>
                                </div>
                            </div>
                        </div>

                        {/* Feedback Box if submitted */}
                        {isSubmitted && submission?.feedback && (
                            <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
                                <div className="p-4 border-b border-[#30363d] bg-[#161b22] flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#a371f7]"></div>
                                    <h3 className="text-xs font-bold text-[#c9d1d9] uppercase">Feedback do Professor</h3>
                                </div>
                                <div className="p-4 text-sm text-[#c9d1d9] leading-relaxed">
                                    {submission.feedback}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// ============================================================================
// MAIN CONTROLLER COMPONENT
// ============================================================================

const StudentActivityResponse: React.FC = () => {
    const { activeActivity, setCurrentPage } = useNavigation();
    const { handleActivitySubmit } = useStudentAcademic();
    const { user } = useAuth();
    const { addToast } = useToast();
    const { theme } = useSettings();

    // Local State
    const [activity, setActivity] = useState<Activity | null>(activeActivity);
    const [submission, setSubmission] = useState<ActivitySubmission | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [dynamicData, setDynamicData] = useState<any>(null); 

    // Fetch Data
    useEffect(() => {
        if (!activeActivity?.id || !user) return;

        if (activeActivity.submissions && activeActivity.submissions.length > 0) {
            setSubmission(activeActivity.submissions[0]);
        }

        const fetchFreshData = async () => {
            if (!navigator.onLine) return;
            setIsLoading(true);
            try {
                const docRef = doc(db, 'activities', activeActivity.id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setActivity({ id: docSnap.id, ...docSnap.data() } as Activity);
                }
                const subRef = doc(db, 'activities', activeActivity.id, 'submissions', user.id);
                const subSnap = await getDoc(subRef);
                if (subSnap.exists()) {
                    setSubmission(subSnap.data() as ActivitySubmission);
                }
            } catch (error) {
                console.error("Error fetching activity:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!activeActivity.submissions || activeActivity.submissions.length === 0) {
            fetchFreshData();
        }
    }, [activeActivity?.id, user]);

    // Items logic
    const items = useMemo(() => {
        if (!activity) return [];
        if (activity.items && activity.items.length > 0) return activity.items;
        if (activity.questions && activity.questions.length > 0) {
            return activity.questions.map((q: any) => ({
                id: q.id.toString(),
                type: 'multiple_choice',
                question: q.question,
                options: q.choices,
                points: 1 
            } as ActivityItem));
        }
        return [];
    }, [activity]);

    const handleAnswerChange = (itemId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [itemId]: value }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setUploadedFiles(Array.from(e.target.files));
    };

    const handleDynamicComplete = (data: any) => {
        setDynamicData(data);
        addToast("Progresso registrado.", "info");
    };

    const handleSubmit = async () => {
        if (!activity || !user) return;
        setIsSubmitting(true);
        try {
            let submittedFilesPayload: { name: string, url: string }[] = [];
            if (uploadedFiles.length > 0) {
                addToast("Enviando arquivos...", "info");
                for (const file of uploadedFiles) {
                    const storageRef = ref(storage, `student_submissions/${activity.id}/${user.id}/${Date.now()}-${file.name}`);
                    await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(storageRef);
                    submittedFilesPayload.push({ name: file.name, url });
                }
            }

            const submissionPayload = {
                answers,
                submittedFiles: submittedFilesPayload,
                dynamicData
            };

            await handleActivitySubmit(activity.id, JSON.stringify(submissionPayload));
            setCurrentPage('activities');
        } catch (error: any) {
            addToast(`Erro: ${error.message}`, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render Dynamic Components wrapper
    const renderComplexContent = () => {
        if (!activity) return null;
        return (
            <Suspense fallback={<div className="p-8 text-center animate-pulse text-xs uppercase tracking-widest">Carregando Módulo...</div>}>
                {activity.type === 'VisualSourceAnalysis' && <VisualSourceAnalysis activity={activity} onComplete={handleDynamicComplete} />}
                {activity.type === 'ConceptConnection' && <ConceptConnection activity={activity} onComplete={handleDynamicComplete} />}
                {activity.type === 'AdvanceOrganizer' && <AdvanceOrganizer activity={activity} onComplete={handleDynamicComplete} />}
                {activity.type === 'ProgressiveTree' && <ProgressiveTree activity={activity} onComplete={handleDynamicComplete} />}
                {activity.type === 'IntegrativeDragDrop' && <IntegrativeDragDrop activity={activity} onComplete={handleDynamicComplete} />}
                {activity.type === 'RoleplayScenario' && <RoleplayScenario activity={activity} onComplete={handleDynamicComplete} />}
            </Suspense>
        );
    };

    if (!activeActivity || !activity) return <div className="min-h-screen bg-black flex items-center justify-center"><SpinnerIcon className="w-8 h-8 text-white" /></div>;

    // --- LAYOUT ROUTER ---
    
    // 1. Silent Hill / Horror
    if (activity.type === 'VisualSourceAnalysis' || theme === 'restless-dreams') {
        return <RestlessLayout {...{ activity, items, answers, handleAnswerChange, handleSubmit, isSubmitting, onBack: () => setCurrentPage('activities'), renderComplexContent, isSubmitted: !!submission, submission, uploadedFiles, handleFileSelect }} />;
    }

    // 2. Paper / Scholar
    if (theme === 'paper') {
        return <ScholarLayout {...{ activity, items, answers, handleAnswerChange, handleSubmit, isSubmitting, onBack: () => setCurrentPage('activities'), renderComplexContent, isSubmitted: !!submission, submission, uploadedFiles, handleFileSelect }} />;
    }

    // 3. Matrix / Terminal
    if (theme === 'matrix') {
        return <TerminalLayout {...{ activity, items, answers, handleAnswerChange, handleSubmit, isSubmitting, onBack: () => setCurrentPage('activities'), renderComplexContent, isSubmitted: !!submission, submission, uploadedFiles, handleFileSelect }} />;
    }

    // 4. Eva / Magi
    if (theme === 'eva') {
        return <MagiLayout {...{ activity, items, answers, handleAnswerChange, handleSubmit, isSubmitting, onBack: () => setCurrentPage('activities'), renderComplexContent, isSubmitted: !!submission, submission, uploadedFiles, handleFileSelect }} />;
    }

    // 5. Cyber / Limitless / Nebula / Repository (General Sci-Fi)
    if (['limitless', 'repository', 'nebula', 'synthwave'].includes(theme)) {
        return <CyberLayout {...{ activity, items, answers, handleAnswerChange, handleSubmit, isSubmitting, onBack: () => setCurrentPage('activities'), renderComplexContent, isSubmitted: !!submission, submission, uploadedFiles, handleFileSelect }} />;
    }

    // 6. Default / Standard / Sith
    return <StandardLayout {...{ activity, items, answers, handleAnswerChange, handleSubmit, isSubmitting, onBack: () => setCurrentPage('activities'), renderComplexContent, isSubmitted: !!submission, submission, uploadedFiles, handleFileSelect }} />;
};

export default StudentActivityResponse;
