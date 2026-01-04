
import React, { useState } from 'react';
import { Scene } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface SceneCardProps {
  scene: Scene;
  onEditImage: (sceneId: string, instruction: string) => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({ scene, onEditImage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [instruction, setInstruction] = useState('');

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    onEditImage(scene.id, instruction);
    setInstruction('');
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md mb-12 last:mb-0">
      <div className="relative aspect-video bg-slate-100 flex items-center justify-center">
        {scene.isGeneratingImage ? (
          <LoadingSpinner message="Generating your scene..." />
        ) : scene.imageUrl ? (
          <img 
            src={scene.imageUrl} 
            alt={scene.imagePrompt} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-slate-400 italic">No image generated</div>
        )}
        
        {scene.imageUrl && !scene.isGeneratingImage && (
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-semibold text-slate-700 shadow-sm hover:bg-white transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Visual
          </button>
        )}
      </div>

      <div className="p-8">
        {isEditing && (
          <form onSubmit={handleSubmitEdit} className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-4">
            <label className="block text-sm font-semibold text-indigo-900 mb-2">Edit Instruction</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder='e.g., "Add a retro filter" or "Make it sunset"'
                className="flex-1 bg-white border border-indigo-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <button 
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Apply
              </button>
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-500 text-sm px-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        <p className="serif text-xl md:text-2xl leading-relaxed text-slate-800 italic">
          "{scene.text}"
        </p>
      </div>
    </div>
  );
};
