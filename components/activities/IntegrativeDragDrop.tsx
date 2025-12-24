
import React, { useState } from 'react';
import type { Activity } from '../../types';

interface Props {
    activity: Activity;
    onComplete: (data: any) => void;
}

export const IntegrativeDragDrop: React.FC<Props> = ({ activity, onComplete }) => {
    const data = activity.integrativeData;
    if (!data) return null;

    // Estado local para onde os itens estão (pending, colA, colB, intersection)
    // Para simplificar sem DND-KIT, usamos click-to-move (Tap item -> Tap destination)
    const [itemsStatus, setItemsStatus] = useState<Record<string, 'pending' | 'columnA' | 'columnB' | 'intersection'>>(
        Object.fromEntries(data.items.map(i => [i.id, 'pending']))
    );
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    const handleItemClick = (id: string) => {
        // Se já está posicionado, volta para pending
        if (itemsStatus[id] !== 'pending') {
            setItemsStatus(prev => ({ ...prev, [id]: 'pending' }));
            return;
        }
        setSelectedItem(id === selectedItem ? null : id);
    };

    const handleZoneClick = (zone: 'columnA' | 'columnB' | 'intersection') => {
        if (selectedItem) {
            setItemsStatus(prev => ({ ...prev, [selectedItem]: zone }));
            setSelectedItem(null);

            // Verifica vitória
            const allPlaced = Object.values({ ...itemsStatus, [selectedItem]: zone }).every(s => s !== 'pending');
            if (allPlaced) {
                // Opcional: Validar se está correto
                onComplete({ status: 'placed', positions: itemsStatus });
            }
        }
    };

    const renderItem = (id: string) => {
        const item = data.items.find(i => i.id === id);
        if (!item) return null;
        
        const isSelected = selectedItem === id;
        const isCorrectPosition = 
            (itemsStatus[id] === 'columnA' && item.correctColumnId === 'A') ||
            (itemsStatus[id] === 'columnB' && item.correctColumnId === 'B') ||
            (itemsStatus[id] === 'intersection' && item.correctColumnId === 'Intersection');

        const placed = itemsStatus[id] !== 'pending';
        let bgClass = isSelected ? 'bg-brand text-black scale-105 shadow-lg' : 'bg-slate-700 text-slate-200 hover:bg-slate-600';
        
        if (placed) {
            bgClass = isCorrectPosition ? 'bg-green-600 text-white' : 'bg-red-500 text-white';
        }

        return (
            <button
                key={id}
                onClick={() => handleItemClick(id)}
                className={`p-2 rounded-lg text-sm font-medium transition-all duration-200 w-full mb-2 ${bgClass}`}
            >
                {item.content}
            </button>
        );
    };

    return (
        <div className="space-y-6 select-none">
            <h3 className="text-center text-xl font-bold text-white mb-2">Classifique os Conceitos</h3>
            <p className="text-center text-slate-400 text-sm mb-6">Toque em um item e depois na coluna correta.</p>

            <div className="flex flex-col md:flex-row gap-4 h-[500px]">
                {/* Coluna A */}
                <div 
                    onClick={() => handleZoneClick('columnA')}
                    className={`flex-1 bg-indigo-900/20 border-2 ${selectedItem ? 'border-indigo-500/50 cursor-pointer hover:bg-indigo-900/40' : 'border-indigo-900/30'} rounded-xl p-4 flex flex-col items-center`}
                >
                    <h4 className="font-bold text-indigo-300 mb-4 text-center">{data.columnA}</h4>
                    <div className="w-full flex-1 overflow-y-auto">
                        {data.items.filter(i => itemsStatus[i.id] === 'columnA').map(i => renderItem(i.id))}
                    </div>
                </div>

                {/* Interseção (Meio) */}
                <div 
                    onClick={() => handleZoneClick('intersection')}
                    className={`w-full md:w-48 bg-purple-900/20 border-2 ${selectedItem ? 'border-purple-500/50 cursor-pointer hover:bg-purple-900/40' : 'border-purple-900/30'} rounded-xl p-4 flex flex-col items-center justify-center`}
                >
                    <h4 className="font-bold text-purple-300 mb-4 text-center text-sm uppercase">Em Comum</h4>
                    <div className="w-full flex-1 overflow-y-auto">
                        {data.items.filter(i => itemsStatus[i.id] === 'intersection').map(i => renderItem(i.id))}
                    </div>
                </div>

                {/* Coluna B */}
                <div 
                    onClick={() => handleZoneClick('columnB')}
                    className={`flex-1 bg-cyan-900/20 border-2 ${selectedItem ? 'border-cyan-500/50 cursor-pointer hover:bg-cyan-900/40' : 'border-cyan-900/30'} rounded-xl p-4 flex flex-col items-center`}
                >
                    <h4 className="font-bold text-cyan-300 mb-4 text-center">{data.columnB}</h4>
                    <div className="w-full flex-1 overflow-y-auto">
                        {data.items.filter(i => itemsStatus[i.id] === 'columnB').map(i => renderItem(i.id))}
                    </div>
                </div>
            </div>

            {/* Banco de Itens */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 min-h-[100px]">
                <p className="text-xs text-slate-500 uppercase font-bold mb-3">Itens Disponíveis</p>
                <div className="flex flex-wrap gap-2">
                    {data.items.filter(i => itemsStatus[i.id] === 'pending').map(i => (
                        <div key={i.id} className="w-auto">{renderItem(i.id)}</div>
                    ))}
                    {data.items.every(i => itemsStatus[i.id] !== 'pending') && (
                        <p className="text-slate-500 italic text-sm w-full text-center">Todos os itens posicionados.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
