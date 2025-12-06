import { GoogleGenAI, Type } from "@google/genai";
import { SmartEventExtraction, Language } from "../types";

// Helper to ensure API key is present
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
};

export const parseNaturalLanguageEvent = async (
  input: string,
  referenceDate: string,
  language: Language
): Promise<SmartEventExtraction | null> => {
  try {
    const ai = getClient();
    
    const prompt = `
      Current Date Reference (YYYY-MM-DD): ${referenceDate}
      User Language Preference: ${language === 'zh' ? 'Chinese' : 'English'}
      
      User Input: "${input}"
      
      Task: Extract event details from the user input.
      Rules:
      1. Interpret relative dates (e.g., "next Friday", "tomorrow", "下周五", "明天") based on the Current Date Reference.
      2. If no time is specified, default to "09:00".
      3. If no date is specified, default to the Current Date Reference.
      4. Extract the title in the language of the User Input.
      5. Return a JSON object matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Short title of the event" },
            date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
            time: { type: Type.STRING, description: "Time in HH:mm 24-hour format" },
            description: { type: Type.STRING, description: "Additional details found in input, or empty string" },
          },
          required: ["title", "date", "time", "description"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text) as SmartEventExtraction;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};