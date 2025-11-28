import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
// Note: In a production app, be careful exposing API keys on the client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBingoItems = async (topic: string, count: number): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a list of ${count} short, fun, and distinct bingo tasks/items related to the topic: "${topic}". 
      Keep items under 6 words. 
      Examples for 'Road Trip': 'See a Cow', 'Yellow Car', 'License Plate from Texas'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) {
      throw new Error("No response from AI");
    }

    const items = JSON.parse(jsonStr) as string[];
    
    // Ensure we have enough items, if not, fill with generic ones (fallback)
    if (items.length < count) {
      const needed = count - items.length;
      for (let i = 0; i < needed; i++) {
        items.push(`Bonus Item ${i + 1}`);
      }
    }
    
    // Return exactly the count needed
    return items.slice(0, count);

  } catch (error) {
    console.error("Error generating bingo items:", error);
    // Fallback if AI fails
    return Array.from({ length: count }, (_, i) => `Task ${i + 1} (${topic})`);
  }
};
