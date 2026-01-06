
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Story, Scene } from "../types";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const generateStoryStructure = async (prompt: string): Promise<Story> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Write a creative short story based on this prompt: "${prompt}". 
    The story should be divided into 3 distinct scenes. 
    Provide a title and for each scene, provide the narrative text and a descriptive prompt for an image generator to illustrate that scene.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                imagePrompt: { type: Type.STRING }
              },
              required: ["text", "imagePrompt"]
            }
          }
        },
        required: ["title", "scenes"]
      }
    }
  });

  const rawJson = JSON.parse(response.text);
  return {
    title: rawJson.title,
    scenes: rawJson.scenes.map((s: any, index: number) => ({
      id: `scene-${Date.now()}-${index}`,
      text: s.text,
      imagePrompt: s.imagePrompt,
      isGeneratingImage: false
    }))
  };
};

export const extendStory = async (story: Story, extensionPrompt: string): Promise<Scene[]> => {
  const ai = getAIClient();
  const context = story.scenes.map((s, i) => `Scene ${i + 1}: ${s.text}`).join('\n');
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are continuing a story titled "${story.title}". 
    The story so far:
    ${context}

    The user wants to add more to the story with this instruction: "${extensionPrompt}". 
    Provide 2 more distinct scenes that naturally follow the current narrative and move the plot forward.
    For each scene, provide the narrative text and a descriptive prompt for an image generator.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          newScenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                imagePrompt: { type: Type.STRING }
              },
              required: ["text", "imagePrompt"]
            }
          }
        },
        required: ["newScenes"]
      }
    }
  });

  const rawJson = JSON.parse(response.text);
  return rawJson.newScenes.map((s: any, index: number) => ({
    id: `scene-ext-${Date.now()}-${index}`,
    text: s.text,
    imagePrompt: s.imagePrompt,
    isGeneratingImage: false
  }));
};

export const generateSceneImage = async (prompt: string): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `A high-quality illustration for: ${prompt}` }]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image was generated");
};

export const editSceneImage = async (base64Image: string, instruction: string): Promise<string> => {
  const ai = getAIClient();
  
  const match = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image format");
  const mimeType = match[1];
  const data = match[2];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: data,
            mimeType: mimeType
          }
        },
        {
          text: `Modify this image based on the following instruction: ${instruction}. Keep the core content but apply the requested changes.`
        }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Image editing failed");
};
