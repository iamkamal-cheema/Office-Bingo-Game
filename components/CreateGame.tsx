import React, { useState } from 'react';
import { CreateGameParams } from '../types';
import { Wand2, Grid3X3, Loader2, Gift } from 'lucide-react';
import { generateBingoItems } from '../services/geminiService';

interface CreateGameProps {
  onCreate: (params: CreateGameParams) => void;
  onCancel: () => void;
}

const HOLIDAY_TASKS = [
  "Visit the Christmas Wonderland or Distillery District",
  "Build a gingerbread house",
  "Light a winter candle",
  "Dress up a pet in holiday costume",
  "Set up and decorate Christmas tree",
  "Go for lunch/dinner with colleagues",
  "Share a holiday tradition with a co-worker",
  "Visit the Scotia Plaza Christmas tree",
  "Set up a Christmas village / train",
  "Donate to charity (clothes, toy, etc.)",
  "Watch a holiday movie",
  "Drive/walk around to see holiday lights",
  "Wrap a holiday gift",
  "Bake holiday-themed cookies",
  "Write a letter to Santa",
  "Go all out on holiday lights",
  "Attend a holiday concert, play, or virtual event",
  "Go ice skating or sledding",
  "Write or make holiday cards",
  "Go for a run or walk outdoors",
  "Enjoy a hot chocolate or festive drink with colleagues",
  "Create and listen to a holiday playlist",
  "Take a festive photo",
  "Make or cook a holiday recipe",
  "Wear an ugly sweater"
];

const CreateGame: React.FC<CreateGameProps> = ({ onCreate, onCancel }) => {
  const [title, setTitle] = useState('');
  const [size, setSize] = useState(5);
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    if (topic) {
      setIsGenerating(true);
      try {
        const totalItems = size * size;
        const items = await generateBingoItems(topic, totalItems);
        onCreate({ title, size, topic, customItems: items });
      } catch (error) {
        alert("Failed to generate items. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Manual creation (empty board to fill later or generic items)
      const items = Array.from({ length: size * size }, (_, i) => `Task ${i + 1}`);
      onCreate({ title, size, customItems: items });
    }
  };

  const loadHolidayTemplate = () => {
    onCreate({
      title: "Holiday Bingo Challenge",
      size: 5,
      topic: "Holiday Fun",
      customItems: HOLIDAY_TASKS
    });
  };

  return (
    <div className="max-w-md mx-auto w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-6 text-white text-center">
        <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-90" />
        <h2 className="text-2xl font-bold">New Bingo Board</h2>
        <p className="text-brand-100 text-sm mt-1">Customize your game</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Templates Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Start</h3>
          <button
            onClick={loadHolidayTemplate}
            disabled={isGenerating}
            className="w-full p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 hover:border-red-300 rounded-xl flex items-center gap-4 transition-all hover:shadow-md group text-left"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm group-hover:scale-110 transition-transform">
              <Gift size={24} />
            </div>
            <div>
              <h4 className="font-bold text-red-900">Holiday Edition</h4>
              <p className="text-xs text-red-700">Use the classic 25 holiday tasks</p>
            </div>
          </button>
        </div>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase">Or Create Custom</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>
      
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Title Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Game Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Summer Vacation, Office Party"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
              required={!isGenerating}
              disabled={isGenerating}
            />
          </div>

          {/* Size Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Grid Size</label>
            <div className="grid grid-cols-3 gap-3">
              {[3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  disabled={isGenerating}
                  className={`
                    py-2 px-4 rounded-lg font-medium border-2 transition-all
                    ${size === s 
                      ? 'border-brand-500 bg-brand-50 text-brand-700' 
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  {s} x {s}
                </button>
              ))}
            </div>
          </div>

          {/* AI Topic Generation */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <label className="flex items-center gap-2 text-sm font-semibold text-indigo-900 mb-2">
              <Wand2 className="w-4 h-4 text-indigo-600" />
              AI Generator (Optional)
            </label>
            <p className="text-xs text-indigo-700 mb-3">
              Enter a topic, and we'll generate the bingo tasks for you!
            </p>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., 'Wedding Photography', 'Airport'"
              className="w-full px-4 py-2 rounded-lg border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              disabled={isGenerating}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-200 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Magic...
                </>
              ) : (
                'Create Custom Game'
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isGenerating}
              className="w-full py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGame;