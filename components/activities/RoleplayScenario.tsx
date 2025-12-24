
import React, { useState, useEffect, useRef } from 'react';
import type { Activity } from '../../types';
import { GoogleGenAI } from "@google/genai";
import { Card } from '../common/Card';
import { SpinnerIcon } from '../../constants/index';

interface Props {
    activity: Activity;
    onComplete: (data: any) => void;
}

interface Message {
    role: 'user' | 'model';
    text: string;
}

export const RoleplayScenario: React.FC<Props> = ({ activity, onComplete }) => {
    const data = activity.roleplayData;
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [session, setSession] = useState<any>(null); // Gemini Chat Session
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize Chat
    useEffect(() => {
        if (!data) return;

        const initChat = async () => {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: `CONTEXTO: ${data.personaContext}. OBJETIVO DO ALUNO: ${data.objective}. Você é a persona descrita. Mantenha o personagem o tempo todo. Seja educativo mas desafiador.`,
                },
            });
            setSession(chat);
            
            // Mensagem inicial da persona
            setMessages([{ role: 'model', text: data.initialMessage }]);
        };

        initChat();
    }, [data]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !session) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const result = await session.sendMessage({ message: userMsg });
            setMessages(prev => [...prev, { role: 'model', text: result.text }]);
            
            // Check completion heuristic (simple length check or specialized prompt later)
            if (messages.length > 8) {
                // onComplete({ status: 'done', history: messages }); // Optional auto-complete
            }
        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { role: 'model', text: "(O personagem parece confuso. Tente novamente.)" }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!data) return null;

    return (
        <div className="h-[600px] flex flex-col bg-black/40 rounded-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                    {data.personaName.charAt(0)}
                </div>
                <div>
                    <h3 className="font-bold text-white">{data.personaName}</h3>
                    <p className="text-xs text-slate-400">Objetivo: {data.objective}</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-md ${
                            msg.role === 'user' 
                                ? 'bg-brand text-black rounded-tr-none' 
                                : 'bg-slate-700 text-slate-100 rounded-tl-none border border-white/5'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-700 p-3 rounded-2xl rounded-tl-none flex gap-1">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900 border-t border-white/10 flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Sua resposta..."
                    className="flex-1 bg-slate-800 border-none rounded-full px-4 py-3 text-white focus:ring-2 focus:ring-brand"
                    disabled={isLoading}
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="p-3 bg-brand text-black rounded-full hover:bg-brand/80 disabled:opacity-50 transition-colors"
                >
                    <svg className="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                </button>
            </div>
        </div>
    );
};
