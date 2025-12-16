
import React, { useState } from 'react';
import type { ModulePage, ModulePageContent, ModulePageContentType } from '../../types';
import { Card } from '../common/Card';
import { ICONS, SpinnerIcon } from '../../constants/index';

const BLOCK_CONFIG: { type: ModulePageContentType, label: string, icon: React.ReactNode }[] = [
    { type: 'title', label: 'Título', icon: ICONS.block_title },
    { type: 'paragraph', label: 'Parágrafo', icon: ICONS.block_paragraph },
    { type: 'list', label: 'Lista', icon: ICONS.block_list },
    { type: 'quote', label: 'Citação', icon: ICONS.block_quote },
    { type: 'image', label: 'Imagem', icon: ICONS.block_image },
    { type: 'video', label: 'Vídeo', icon: ICONS.block_video },
    { type: 'divider', label: 'Linha Divisória', icon: ICONS.block_divider },
];

const AlignmentControls: React.FC<{ onAlignChange: (align: 'left' | 'center' | 'right' | 'justify') => void; currentAlign?: string; }> = ({ onAlignChange, currentAlign }) => (
    <div className="flex items-center space-x-1">
        {(['left', 'center', 'right', 'justify'] as const).map(align => (
            <button
                key={align}
                type="button"
                onClick={() => onAlignChange(align)}
                className={`p-1.5 rounded-md transition-colors ${
                    currentAlign === align 
                        ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/30 dark:text-indigo-300' 
                        : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-600'
                }`}
                aria-pressed={currentAlign === align}
                aria-label={`Alinhar ${align}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {align === 'left' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h16" />}
                    {align === 'center' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M7 14h10M4 18h16" />}
                    {align === 'right' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M10 14h10M4 18h16" />}
                    {align === 'justify' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />}
                </svg>
            </button>
        ))}
    </div>
);

interface ModuleContentEditorProps {
    pages: ModulePage[];
    updatePageTitle: (id: number, title: string) => void;
    addPage: () => void;
    removePage: (id: number) => void;
    addBlock: (pageId: number, type: ModulePageContentType) => void;
    removeBlock: (pageId: number, index: number) => void;
    updateBlock: (pageId: number, index: number, data: Partial<ModulePageContent>) => void;
    moveBlock: (pageId: number, index: number, dir: 'up' | 'down') => void;
    openAIModal: (pageId: number) => void;
    onImageUpload?: (file: File) => Promise<string>;
}

export const ModuleContentEditor: React.FC<ModuleContentEditorProps> = ({
    pages, updatePageTitle, addPage, removePage, 
    addBlock, removeBlock, updateBlock, moveBlock,
    openAIModal, onImageUpload
}) => {
    // Stores specific block coordinates being uploaded {pageId, blockIndex} or null
    const [uploadingBlockCoords, setUploadingBlockCoords] = useState<{pageId: number, blockIndex: number} | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, pageId: number, blockIndex: number) => {
        if (e.target.files && e.target.files[0] && onImageUpload) {
            const file = e.target.files[0];
            setUploadingBlockCoords({ pageId, blockIndex });
            try {
                const url = await onImageUpload(file);
                updateBlock(pageId, blockIndex, { content: url });
            } catch (error) {
                console.error("Failed to upload content image", error);
                alert("Erro ao fazer upload da imagem.");
            } finally {
                setUploadingBlockCoords(null);
                e.target.value = ''; // Reset input
            }
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center border-b dark:border-slate-700 pb-4 mb-6">
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Conteúdo</h3>
                <button onClick={addPage} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 hc-button-override">Nova Página</button>
            </div>
            
            <div className="space-y-8">
                {pages.map((page) => (
                    <div key={page.id} className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200">
                                <input 
                                    type="text" 
                                    value={page.title} 
                                    onChange={(e) => updatePageTitle(page.id, e.target.value)}
                                    className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                                />
                            </h4>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => openAIModal(page.id)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 mr-2 flex items-center">
                                    <div className="h-3 w-3 mr-1">{ICONS.ai_generate}</div> IA
                                </button>
                                <button onClick={() => removePage(page.id)} disabled={pages.length === 1} className="text-red-500 hover:text-red-700 disabled:opacity-30">Excluir Página</button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {page.content.map((block, blockIndex) => {
                                const inputClasses = "w-full p-2 border-gray-300 rounded-md bg-white text-black dark:bg-slate-800 dark:border-slate-600 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500";
                                const alignMap: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify' };
                                const alignClass = block.align ? alignMap[block.align] : 'text-left';
                                const hasAlignment = block.type === 'title' || block.type === 'paragraph';
                                
                                const isThisBlockUploading = uploadingBlockCoords?.pageId === page.id && uploadingBlockCoords?.blockIndex === blockIndex;

                                return (
                                    <div key={blockIndex} className="p-4 bg-white dark:bg-slate-800 border rounded-lg relative group dark:border-slate-700 shadow-sm">
                                        <div className="space-y-2">
                                            {block.type === 'title' && <input type="text" placeholder="Título" value={block.content as string} onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value })} className={`${inputClasses} text-2xl font-bold ${alignClass}`} />}
                                            {block.type === 'paragraph' && <textarea placeholder="Parágrafo" value={block.content as string} onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value })} rows={4} className={`${inputClasses} ${alignClass}`} />}
                                            {block.type === 'list' && <textarea placeholder="Um item por linha" value={(block.content as string[]).join('\n')} onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value.split('\n') })} rows={4} className={inputClasses} />}
                                            {block.type === 'quote' && <textarea placeholder="Citação" value={block.content as string} onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value })} rows={2} className={`${inputClasses} italic`} />}
                                            
                                            {block.type === 'image' && (
                                                <div className="space-y-3">
                                                    {/* Image Preview with Upload State */}
                                                    <div className="w-full max-h-48 bg-slate-100 dark:bg-slate-900 rounded-md flex items-center justify-center overflow-hidden border dark:border-slate-600 relative">
                                                        {isThisBlockUploading ? (
                                                            <div className="flex flex-col items-center justify-center p-4">
                                                                <SpinnerIcon className="h-8 w-8 text-indigo-600 animate-spin" />
                                                                <span className="text-xs text-slate-500 mt-2">Enviando...</span>
                                                            </div>
                                                        ) : block.content && typeof block.content === 'string' ? (
                                                            <img 
                                                                src={block.content} 
                                                                alt={block.alt || 'Preview'} 
                                                                className="max-h-48 object-contain" 
                                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <div className="p-8 text-slate-400">
                                                                {ICONS.block_image}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* URL Input */}
                                                    <input 
                                                        type="text" 
                                                        placeholder="URL da Imagem (https://...)" 
                                                        value={block.content as string} 
                                                        onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value })} 
                                                        className={inputClasses} 
                                                        disabled={isThisBlockUploading}
                                                    />

                                                    {/* Description + Upload Row */}
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Descrição da Imagem (Alt Text)" 
                                                            value={block.alt || ''} 
                                                            onChange={e => updateBlock(page.id, blockIndex, { alt: e.target.value })} 
                                                            className={inputClasses} 
                                                        />
                                                        {onImageUpload && (
                                                            <label className={`flex-shrink-0 cursor-pointer px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 flex items-center justify-center gap-2 min-w-[80px] ${isThisBlockUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                                <input 
                                                                    type="file" 
                                                                    className="hidden" 
                                                                    accept="image/*"
                                                                    disabled={isThisBlockUploading}
                                                                    onChange={(e) => handleFileSelect(e, page.id, blockIndex)}
                                                                />
                                                                {isThisBlockUploading ? <SpinnerIcon className="h-5 w-5 text-indigo-600" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>}
                                                                <span className="text-xs font-semibold">Upload</span>
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {block.type === 'video' && <input type="text" placeholder="URL do Vídeo (YouTube)" value={block.content as string} onChange={e => updateBlock(page.id, blockIndex, { content: e.target.value })} className={inputClasses} />}
                                            {block.type === 'divider' && <div className="w-full h-px bg-slate-300 dark:bg-slate-600 my-4" />}
                                            
                                            {hasAlignment && (
                                                <div className="pt-2">
                                                    <AlignmentControls 
                                                        onAlignChange={(align) => updateBlock(page.id, blockIndex, { align })} 
                                                        currentAlign={block.align} 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button type="button" onClick={() => moveBlock(page.id, blockIndex, 'up')} disabled={blockIndex === 0} className="p-1.5 bg-slate-100 border rounded-md shadow-sm disabled:opacity-30 dark:bg-slate-700 dark:border-slate-600 hover:bg-slate-200">↑</button>
                                            <button type="button" onClick={() => moveBlock(page.id, blockIndex, 'down')} disabled={blockIndex === page.content.length - 1} className="p-1.5 bg-slate-100 border rounded-md shadow-sm disabled:opacity-30 dark:bg-slate-700 dark:border-slate-600 hover:bg-slate-200">↓</button>
                                            <button type="button" onClick={() => removeBlock(page.id, blockIndex)} className="p-1.5 bg-red-100 text-red-600 border border-red-200 rounded-md shadow-sm hover:bg-red-200">×</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                            {BLOCK_CONFIG.map(block => (
                                <button
                                    key={block.type}
                                    onClick={() => addBlock(page.id, block.type)}
                                    className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors shadow-sm"
                                >
                                    <div className="text-indigo-500 dark:text-indigo-400 mb-1">{block.icon}</div>
                                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{block.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};
