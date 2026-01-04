
export interface Scene {
  id: string;
  text: string;
  imagePrompt: string;
  imageUrl?: string;
  isGeneratingImage: boolean;
}

export interface Story {
  title: string;
  scenes: Scene[];
}

export interface EditRequest {
  sceneId: string;
  instruction: string;
}
