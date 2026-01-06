
import React, { useState, useCallback } from 'react';
import { generateStoryStructure, generateSceneImage, editSceneImage, extendStory } from './services/geminiService';
import { Story, Scene } from './types';
import { SceneCard } from './components/SceneCard';
import { LoadingSpinner } from './components/LoadingSpinner';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [extensionPrompt, setExtensionPrompt] = useState('');
  const [story, setStory] = useState<Story | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isExtendingStory, setIsExtendingStory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGeneratingStory(true);
    setError(null);
    setStory(null);

    try {
      const newStory = await generateStoryStructure(prompt);
      setStory(newStory);
      
      // Immediately start generating images for all initial scenes
      newStory.scenes.forEach((scene) => {
        generateImageForScene(scene.id, scene.imagePrompt);
      });
    } catch (err: any) {
      console.error(err);
      setError("Failed to weave the story. Please try again.");
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const generateImageForScene = useCallback(async (sceneId: string, imagePrompt: string) => {
    setStory(prev => {
      if (!prev) return null;
      return {
        ...prev,
        scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isGeneratingImage: true } : s)
      };
    });

    try {
      const imageUrl = await generateSceneImage(imagePrompt);
      setStory(prev => {
        if (!prev) return null;
        return {
          ...prev,
          scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, imageUrl, isGeneratingImage: false } : s)
        };
      });
    } catch (err) {
      console.error(err);
      setStory(prev => {
        if (!prev) return null;
        return {
          ...prev,
          scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isGeneratingImage: false } : s)
        };
      });
    }
  }, []);

  const handleExtendStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionPrompt.trim() || !story) return;

    setIsExtendingStory(true);
    setError(null);
    const instruction = extensionPrompt;
    setExtensionPrompt('');

    try {
      const newScenes = await extendStory(story, instruction);
      
      setStory(prev => {
        if (!prev) return null;
        return {
          ...prev,
          scenes: [...prev.scenes, ...newScenes]
        };
      });

      // Start image generation for the new scenes
      newScenes.forEach(scene => {
        generateImageForScene(scene.id, scene.imagePrompt);
      });
    } catch (err) {
      console.error(err);
      setError("The narrative thread broke. Could not extend the story.");
    } finally {
      setIsExtendingStory(false);
    }
  };

  const handleEditImage = async (sceneId: string, instruction: string) => {
    setStory(prev => {
      if (!prev) return null;
      return {
        ...prev,
        scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isGeneratingImage: true } : s)
      };
    });

    try {
      const currentScene = story?.scenes.find(s => s.id === sceneId);
      if (!currentScene?.imageUrl) throw new Error("No image to edit");

      const newImageUrl = await editSceneImage(currentScene.imageUrl, instruction);
      
      setStory(prev => {
        if (!prev) return null;
        return {
          ...prev,
          scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, imageUrl: newImageUrl, isGeneratingImage: false } : s)
        };
      });
    } catch (err) {
      console.error(err);
      setError("Failed to edit image. The AI might be busy.");
      setStory(prev => {
        if (!prev) return null;
        return {
          ...prev,
          scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isGeneratingImage: false } : s)
        };
      });
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">StoryWeaver</h1>
          </div>
          {story && (
            <button 
              onClick={() => { setStory(null); setPrompt(''); }}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-12">
        {!story && !isGeneratingStory ? (
          <div className="text-center max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-4">
              <h2 className="serif text-5xl font-bold text-slate-900 leading-tight">
                Every story deserves a <span className="text-indigo-600">beautiful</span> visual.
              </h2>
              <p className="text-xl text-slate-500">
                Describe a concept, a dream, or a simple thought, and let our AI weaver craft a multi-scene story with custom illustrations.
              </p>
            </div>

            <form onSubmit={handleGenerateStory} className="relative group">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Once upon a time, a small robot found a glowing seed..."
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-5 text-lg shadow-xl shadow-indigo-100 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                disabled={isGeneratingStory}
              />
              <button
                type="submit"
                disabled={!prompt.trim() || isGeneratingStory}
                className="absolute right-2.5 top-2.5 bottom-2.5 bg-indigo-600 text-white px-8 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none transition-all active:scale-95 flex items-center gap-2"
              >
                Weave
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </form>

            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {['A cyberpunk detective', 'A friendly dragon', 'Journey to Mars', 'The secret library'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setPrompt(tag)}
                  className="px-4 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in duration-500">
            {isGeneratingStory ? (
              <div className="py-24">
                <LoadingSpinner message="Weaving your narrative tapestry..." />
              </div>
            ) : story ? (
              <>
                <div className="text-center space-y-4">
                  <h2 className="serif text-4xl md:text-5xl font-bold text-slate-900">{story.title}</h2>
                  <div className="w-24 h-1 bg-indigo-600 mx-auto rounded-full"></div>
                </div>

                <div className="max-w-3xl mx-auto space-y-12">
                  {story.scenes.map((scene) => (
                    <SceneCard 
                      key={scene.id} 
                      scene={scene} 
                      onEditImage={handleEditImage} 
                    />
                  ))}

                  {/* Extension Area */}
                  <div className="pt-8 pb-16 border-t border-slate-100">
                    {isExtendingStory ? (
                      <LoadingSpinner message="Extending the story..." />
                    ) : (
                      <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-inner">
                        <div className="mb-6">
                          <h3 className="text-lg font-bold text-slate-900 mb-1">What happens next?</h3>
                          <p className="text-sm text-slate-500">Add a new twist, a new character, or continue the scene.</p>
                        </div>
                        <form onSubmit={handleExtendStory} className="relative">
                          <input
                            type="text"
                            value={extensionPrompt}
                            onChange={(e) => setExtensionPrompt(e.target.value)}
                            placeholder="Continue the journey..."
                            className="w-full bg-white border border-slate-300 rounded-2xl px-6 py-4 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                          <button
                            type="submit"
                            disabled={!extensionPrompt.trim() || isExtendingStory}
                            className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-6 rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:bg-slate-300 flex items-center gap-2"
                          >
                            Add Chapter
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>

                <footer className="text-center pb-12">
                  <p className="text-slate-400 text-sm italic">Fin. Created by StoryWeaver AI.</p>
                </footer>
              </>
            ) : null}
          </div>
        )}

        {error && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-600 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 hover:text-red-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
