
import { GoogleGenAI, Type } from "@google/genai";
import { BiblePassage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getBibleContent = async (book: string, chapter: string): Promise<BiblePassage> => {
  // Usamos gemini-3-flash-preview para máxima eficiência
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Atue como um Professor da Bíblia especializado em acessibilidade. 
               Gere o conteúdo para o livro de ${book}, capítulo ${chapter}.
               
               IMPORTANTE: 
               - "fullText" deve ser o capítulo COMPLETO, começando cada versículo com seu número (Ex: 1 No princípio... 2 E a terra...). Não pule versículos.
               - "summary" deve ser uma explicação simples (nível fundamental) do que acontece no capítulo.
               - "devotional" deve ser uma mensagem de conforto ou ensinamento prático.
               - "questions" deve conter 3 perguntas divertidas sobre o que foi lido.
               
               O retorno deve ser APENAS o JSON.`,
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

  const text = response.text;
  if (!text) {
    throw new Error("Não foi possível carregar as escrituras.");
  }

  return JSON.parse(text.trim());
};

export const generateAudioSpeech = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Leia com calma e voz acolhedora: ${text}` }] }],
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
