
import React, { useState } from 'react';
import type { ModulePage, ModulePageContent, ModulePageContentType } from '../../types';
import { ICONS, SpinnerIcon } from '../../constants/index';

const BLOCK_CONFIG: { type: ModulePageContentType, label: string, icon: React.ReactNode, color: string }[] = [
    { type: 'title', label: 'Título', icon: ICONS.block_title, color: 'text-blue-400' },
    { type: 'paragraph', label: 'Texto', icon: ICONS.block_paragraph, color: 'text-slate-300' },
    { type: 'image', label: 'Imagem', icon: ICONS.block_image, color: 'text-pink-400' },
    { type: 'video', label: 'Vídeo', icon: ICONS.block_video, color: 'text-red-400' },
    { type: 'list', label: 'Lista', icon: ICONS.block_list, color: 'text-emerald-400' },
    { type: 'quote', label: 'Citação', icon: ICONS.block_quote, color: 'text-amber-400' },
    { type: 'divider', label: 'Divisor', icon: ICONS.block_divider, color: 'text-slate-500' },
];

const AlignmentControls: React.FC<{ onAlignChange: (align: 'left' | 'center' | 'right' | 'justify') => void; currentAlign?: string; }> = ({ onAlignChange, currentAlign }) => (
    <div className="flex bg-[#0d1117] rounded-lg p-1 border border-white/10">
        {(['left', 'center', 'right', 'justify'] as const).map(align => (
            <button
                key={align}
                type="button"
                onClick={() => onAlignChange(align)}
                className={`p-1.5 rounded-md transition-colors ${
                    currentAlign === align 
                        ? 'bg-white/10 text-white' 
                        : 'text-slate-500 hover:text-slate-300'
                }`}
                title={`Alinhar ${align}`}
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
    // Current active page tab
    const [activePageId, setActivePageId] = useState(pages[0]?.id);
    const [uploadingBlockCoords, setUploadingBlockCoords] = useState<{pageId: number, blockIndex: number} | null>(null);

    // Sync active page if pages change (deletion)
    if (!pages.find(p => p.id === activePageId)) {
        setActivePageId(pages[0]?.id);
    }

    const activePage = pages.find(p => p.id === activePageId);

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
                e.target.value = ''; 
            }
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            
            {/* Pages Navigation Bar (Tabs style) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar border-b border-white/10">
                {pages.map((page, index) => (
                    <button
                        key={page.id}
                        onClick={() => setActivePageId(page.id)}
                        className={`group relative px-5 py-3 rounded-t-xl transition-all min-w-[120px] text-left border-t border-x ${
                            activePageId === page.id 
                            ? 'bg-[#161b22] border-white/10 text-white z-10' 
                            : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                    >
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1">Página {index + 1}</div>
                        <div className="text-sm font-semibold truncate max-w-[150px]">{page.title}</div>
                        
                        {/* Remove Button (Hover only) */}
                        {pages.length > 1 && (
                            <div 
                                onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                                className="absolute top-2 right-2 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </div>
                        )}
                    </button>
                ))}
                <button 
                    onClick={addPage}
                    className="p-2 ml-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-brand border border-white/5 transition-colors"
                    title="Adicionar Página"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                </button>
            </div>

            {/* Active Page Editor Area */}
            {activePage && (
                <div className="bg-[#161b22] border border-white/10 rounded-b-xl rounded-tr-xl p-6 min-h-[600px] shadow-2xl relative">
                    
                    {/* Page Header */}
                    <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                        <div className="w-full max-w-md">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Título da Página</label>
                            <input 
                                type="text" 
                                value={activePage.title} 
                                onChange={(e) => updatePageTitle(activePage.id, e.target.value)}
                                className="w-full bg-transparent text-2xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-b focus:border-brand transition-colors pb-1"
                                placeholder="Digite um título..."
                            />
                        </div>
                        <button 
                            onClick={() => openAIModal(activePage.id)} 
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 transition-colors text-xs font-bold uppercase tracking-wide"
                        >
                            <div className="h-4 w-4">{ICONS.ai_generate}</div>
                            Assistente IA
                        </button>
                    </div>

                    {/* Blocks List */}
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {activePage.content.map((block, blockIndex) => {
                            const inputBase = "w-full p-4 bg-[#0d1117] text-slate-200 border border-white/5 rounded-lg focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all placeholder:text-slate-600";
                            const isThisBlockUploading = uploadingBlockCoords?.pageId === activePage.id && uploadingBlockCoords?.blockIndex === blockIndex;

                            return (
                                <div key={blockIndex} className="group relative pl-4 border-l-2 border-transparent hover:border-white/20 transition-all">
                                    
                                    {/* Block Controls (Hover) */}
                                    <div className="absolute -right-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveBlock(activePage.id, blockIndex, 'up')} disabled={blockIndex === 0} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded border border-white/10 disabled:opacity-30">↑</button>
                                        <button onClick={() => moveBlock(activePage.id, blockIndex, 'down')} disabled={blockIndex === activePage.content.length - 1} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded border border-white/10 disabled:opacity-30">↓</button>
                                        <button onClick={() => removeBlock(activePage.id, blockIndex)} className="p-1.5 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded border border-red-900/50 mt-2">×</button>
                                    </div>

                                    {/* Content Inputs */}
                                    <div className="space-y-2">
                                        {/* TYPE LABEL */}
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-mono text-slate-500 uppercase">{block.type}</span>
                                            {(block.type === 'title' || block.type === 'paragraph') && (
                                                <AlignmentControls onAlignChange={(align) => updateBlock(activePage.id, blockIndex, { align })} currentAlign={block.align} />
                                            )}
                                        </div>

                                        {block.type === 'title' && (
                                            <input type="text" placeholder="Cabeçalho..." value={block.content as string} onChange={e => updateBlock(activePage.id, blockIndex, { content: e.target.value })} className={`${inputBase} text-2xl font-bold`} style={{ textAlign: block.align || 'left' }} />
                                        )}
                                        
                                        {block.type === 'paragraph' && (
                                            <textarea placeholder="Escreva seu parágrafo..." value={block.content as string} onChange={e => updateBlock(activePage.id, blockIndex, { content: e.target.value })} rows={4} className={`${inputBase} leading-relaxed`} style={{ textAlign: block.align || 'left' }} />
                                        )}
                                        
                                        {block.type === 'list' && (
                                            <textarea placeholder="• Item 1&#10;• Item 2" value={(block.content as string[]).join('\n')} onChange={e => updateBlock(activePage.id, blockIndex, { content: e.target.value.split('\n') })} rows={4} className={`${inputBase} font-mono text-sm`} />
                                        )}
                                        
                                        {block.type === 'quote' && (
                                            <div className="flex">
                                                <div className="w-1 bg-amber-500 rounded-l"></div>
                                                <textarea placeholder="Citação..." value={block.content as string} onChange={e => updateBlock(activePage.id, blockIndex, { content: e.target.value })} rows={2} className={`${inputBase} italic rounded-l-none bg-amber-900/10 border-amber-500/20`} />
                                            </div>
                                        )}

                                        {block.type === 'image' && (
                                            <div className="bg-[#0d1117] border border-white/5 rounded-xl p-4 space-y-4">
                                                <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border border-dashed border-white/10 relative">
                                                    {isThisBlockUploading ? (
                                                        <SpinnerIcon className="h-8 w-8 text-brand" />
                                                    ) : block.content && typeof block.content === 'string' ? (
                                                        <img src={block.content} alt={block.alt || 'Preview'} className="max-h-full object-contain" />
                                                    ) : (
                                                        <div className="text-slate-600 flex flex-col items-center">
                                                            <span className="text-4xl mb-2">🖼️</span>
                                                            <span className="text-xs">Preview da Imagem</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input type="text" placeholder="https://..." value={block.content as string} onChange={e => updateBlock(activePage.id, blockIndex, { content: e.target.value })} className={`${inputBase} py-2 text-xs`} />
                                                    {onImageUpload && (
                                                        <label className="flex items-center px-4 bg-brand/10 text-brand rounded-lg cursor-pointer hover:bg-brand/20 transition-colors border border-brand/20">
                                                            <span className="text-xs font-bold uppercase">Upload</span>
                                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, activePage.id, blockIndex)} disabled={isThisBlockUploading} />
                                                        </label>
                                                    )}
                                                </div>
                                                <input type="text" placeholder="Legenda (Alt Text)" value={block.alt || ''} onChange={e => updateBlock(activePage.id, blockIndex, { alt: e.target.value })} className={`${inputBase} py-2 text-xs`} />
                                            </div>
                                        )}

                                        {block.type === 'video' && (
                                            <div className="flex items-center gap-2 bg-[#0d1117] p-2 rounded-lg border border-white/5">
                                                <span className="text-red-500 text-lg">▶</span>
                                                <input type="text" placeholder="YouTube URL..." value={block.content as string} onChange={e => updateBlock(activePage.id, blockIndex, { content: e.target.value })} className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-600" />
                                            </div>
                                        )}

                                        {block.type === 'divider' && <div className="h-px bg-white/10 w-full my-4 flex items-center justify-center"><span className="bg-[#161b22] px-2 text-slate-600 text-xs">DIVISOR</span></div>}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add Block Toolbar */}
                        <div className="pt-8 pb-4">
                            <p className="text-center text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">— Adicionar Bloco —</p>
                            <div className="flex flex-wrap justify-center gap-3">
                                {BLOCK_CONFIG.map(b => (
                                    <button
                                        key={b.type}
                                        onClick={() => addBlock(activePage.id, b.type)}
                                        className="flex flex-col items-center justify-center w-20 h-20 bg-[#0d1117] border border-white/5 rounded-xl hover:border-brand/50 hover:bg-white/5 transition-all group shadow-lg"
                                    >
                                        <div className={`mb-1 ${b.color} opacity-70 group-hover:opacity-100 transition-opacity transform group-hover:scale-110`}>{b.icon}</div>
                                        <span className="text-[10px] text-slate-400 group-hover:text-white font-medium">{b.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
