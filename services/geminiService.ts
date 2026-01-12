
import { GoogleGenAI, Type } from "@google/genai";
import { BiblePassage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getBibleContent = async (book: string, chapter: string): Promise<BiblePassage> => {
  // Usamos gemini-3-flash-preview para maior velocidade e compatibilidade
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Atue como um erudito bíblico e tradutor. Forneça o conteúdo para ${book} capítulo ${chapter}. 
               
               REGRAS DE OURO:
               1. "fullText" deve conter TODOS os versículos do capítulo numerados (Ex: 1 No princípio... 2 E a terra...).
               2. "summary" deve ser um resumo simples e fácil de ler.
               3. "devotional" deve ser uma aplicação prática para a vida.
               4. "questions" deve conter 3 perguntas de múltipla escolha sobre o texto.
               5. O retorno DEVE ser um JSON puro, sem markdown extra.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reference: { type: Type.STRING },
          fullText: { type: Type.STRING },
          summary: { type: Type.STRING },
          devotional: { type: Type.STRING },
          keyVerses: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correctAnswer: { type: Type.INTEGER }
              },
              required: ["question", "options", "correctAnswer"]
            }
          }
        },
        required: ["reference", "fullText", "summary", "devotional", "questions", "keyVerses"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Resposta vazia da API");
  }

  return JSON.parse(response.text.trim());
};

export const generateAudioSpeech = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Narração bíblica solene e clara para pessoa com dificuldade de leitura: ${text}` }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio || '';
};
