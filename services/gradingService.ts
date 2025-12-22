
import { GoogleGenAI } from "@google/genai";

// Initialize the client directly. 
// Note: Ensure process.env.API_KEY is available in your environment variables/Vite config.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface StreamingGradingResult {
    finalGrade: number;
    fullFeedback: string;
}

/**
 * Streams the AI grading response.
 * The model is instructed to provide the feedback text first (for streaming)
 * and the numeric grade at the very end in a specific format.
 * 
 * @param question The question text
 * @param answer The student's answer
 * @param maxPoints The maximum points for the question
 * @param onChunk Callback fired when a text chunk is received
 */
export async function streamGradingFeedback(
    question: string,
    answer: string,
    maxPoints: number,
    onChunk: (text: string) => void
): Promise<StreamingGradingResult> {
    
    if (!answer || answer.trim() === "") {
        return { finalGrade: 0, fullFeedback: "Não houve resposta para esta questão." };
    }

    const prompt = `
    Atue como um professor de História experiente e didático.
    Avalie a resposta do aluno para a questão abaixo.

    ---
    Enunciado: "${question}"
    Resposta do Aluno: "${answer}"
    Valor da Questão: ${maxPoints} pontos
    ---

    Instruções de Saída:
    1. Primeiro, forneça um feedback construtivo (Feedback Pedagógico). Explique os acertos, erros e o que poderia ser melhorado. Fale diretamente com o aluno.
    2. Ao final, EM UMA NOVA LINHA, escreva a nota exata no formato: [[GRADE: <numero>]]
    
    Exemplo de final:
    ... continue estudando este tópico.
    [[GRADE: 8.5]]
    `;

    try {
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.3, // Lower temperature for consistent grading
            }
        });

        let fullText = '';
        let finalGrade = 0;

        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                fullText += text;
                // We stream everything to the UI immediately
                onChunk(text);
            }
        }

        // Extract Grade from the special tag [[GRADE: x]]
        const gradeMatch = fullText.match(/\[\[GRADE:\s*([\d\.,]+)\s*\]\]/);
        if (gradeMatch) {
            const gradeString = gradeMatch[1].replace(',', '.');
            finalGrade = parseFloat(gradeString);
            
            // Clean the tag from the visible feedback if desired, 
            // though keeping it allows the user to see the "decision" point.
            // Let's trim it from the final returned string for clean storage if needed.
            // fullText = fullText.replace(gradeMatch[0], '').trim();
        } else {
            console.warn("Could not parse grade from AI response. Defaulting to 0.");
        }

        // Clamp grade
        finalGrade = Math.max(0, Math.min(finalGrade, maxPoints));

        return {
            finalGrade,
            fullFeedback: fullText
        };

    } catch (error) {
        console.error("Error in AI Grading Service:", error);
        throw error;
    }
}
