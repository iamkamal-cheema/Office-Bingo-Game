import React, { useState, useEffect } from 'react';
import { BingoGame, CreateGameParams } from './types';
import BingoBoard from './components/BingoBoard';
import CreateGame from './components/CreateGame';
import { Plus, Camera, History, ChevronRight } from 'lucide-react';

// Use local storage to persist games
const STORAGE_KEY = 'bingo_snap_games_v1';

const App: React.FC = () => {
  const [games, setGames] = useState<BingoGame[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Load from storage on mount with migration logic
  useEffect(() => {
    // 1. Check for shared game import in URL
    const params = new URLSearchParams(window.location.search);
    const importData = params.get('import');
    let importedGame: BingoGame | null = null;

    if (importData) {
      try {
        const json = decodeURIComponent(atob(importData));
        importedGame = JSON.parse(json);
        // Clean the URL so a refresh doesn't re-import
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error("Failed to parse shared game", e);
      }
    }

    // 2. Load existing games
    const stored = localStorage.getItem(STORAGE_KEY);
    let loadedGames: BingoGame[] = [];
    
    if (stored) {
      try {
        const parsedGames = JSON.parse(stored);
        // Migration: Ensure all cells have 'photos' array
        loadedGames = parsedGames.map((game: any) => ({
          ...game,
          cells: game.cells.map((cell: any) => ({
            ...cell,
            photos: cell.photos || (cell.photoUrl ? [cell.photoUrl] : [])
          }))
        }));
      } catch (e) {
        console.error("Failed to parse local games", e);
      }
    }

    // 3. Merge import if exists
    if (importedGame) {
      // Check if we already have this specific game ID (avoid duplicates)
      const exists = loadedGames.some(g => g.id === importedGame!.id);
      if (!exists) {
        // Prepend imported game
        loadedGames = [importedGame, ...loadedGames];
        setActiveGameId(importedGame.id); // Auto open it
        alert(`Joined game: "${importedGame.title}"!`);
      } else {
        setActiveGameId(importedGame.id); // Just open it
      }
    }

    setGames(loadedGames);
  }, []);

  // Save to storage whenever games change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    } catch (error) {
       // Check if error is quota exceeded
       if (error instanceof DOMException && 
          (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
           alert("Storage full! Unable to save progress. Please delete some old games or photos to make space.");
           // Note: We don't revert state here, so the user can see their photo, but it won't persist on refresh.
       } else {
         console.error("Failed to save games", error);
       }
    }
  }, [games]);

  const handleCreateGame = (params: CreateGameParams) => {
    const newGame: BingoGame = {
      id: Date.now().toString(),
      title: params.title,
      size: params.size,
      createdAt: Date.now(),
      theme: params.topic,
      cells: (params.customItems || []).map((text, idx) => ({
        id: `cell-${Date.now()}-${idx}`,
        text: text,
        photos: []
      })),
    };

    setGames(prev => [newGame, ...prev]);
    setActiveGameId(newGame.id);
    setIsCreating(false);
  };

  const handleUpdateGame = (updatedGame: BingoGame) => {
    setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
  };

  const handleDeleteGame = () => {
    if (activeGameId) {
      setGames(prev => prev.filter(g => g.id !== activeGameId));
      setActiveGameId(null);
    }
  };

  const activeGame = games.find(g => g.id === activeGameId);

  // View: Active Game Board
  if (activeGame) {
    return (
      <div className="min-h-screen bg-slate-50">
        <BingoBoard 
          game={activeGame} 
          onUpdateGame={handleUpdateGame} 
          onDeleteGame={handleDeleteGame}
          onBack={() => setActiveGameId(null)} 
        />
      </div>
    );
  }

  // View: Create New Game Form
  if (isCreating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <CreateGame 
          onCreate={handleCreateGame} 
          onCancel={() => setIsCreating(false)} 
        />
      </div>
    );
  }

  // View: Dashboard (List of Games)
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-200">
              <Camera size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Bingo Snap</h1>
          </div>
          {games.length > 0 && (
             <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
               {games.length} Games
             </span>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8 pb-24">
        {games.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="text-brand-300 w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Games Yet</h2>
            <p className="text-gray-500 mb-8">Create a bingo board to start snapping photos!</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all active:scale-95"
            >
              Start New Game
            </button>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                   <History className="w-5 h-5 text-gray-400" />
                   Your Games
                </h3>
             </div>

             <div className="grid gap-4">
                {games.map(game => {
                  const completedCount = game.cells.filter(c => c.photos && c.photos.length > 0).length;
                  const totalCount = game.cells.length;
                  const percent = Math.round((completedCount / totalCount) * 100);

                  return (
                    <button 
                      key={game.id}
                      onClick={() => setActiveGameId(game.id)}
                      className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex items-center gap-4 relative overflow-hidden"
                    >
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold
                        ${percent === 100 ? 'bg-green-100 text-green-600' : 'bg-brand-50 text-brand-600'}
                      `}>
                        {percent}%
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate pr-4">{game.title}</h4>
                        <p className="text-sm text-gray-500 truncate">
                          {game.theme ? game.theme : `${game.size}x${game.size} Grid`}
                        </p>
                      </div>

                      <ChevronRight className="text-gray-300 group-hover:text-brand-500 transition-colors" />
                    </button>
                  );
                })}
             </div>
          </div>
        )}
      </main>

      {/* Floating Action Button for adding new game */}
      {games.length > 0 && (
        <div className="fixed bottom-6 right-6 z-20">
          <button 
            onClick={() => setIsCreating(true)}
            className="w-14 h-14 bg-brand-600 text-white rounded-full shadow-xl shadow-brand-300 flex items-center justify-center hover:bg-brand-700 transition-transform hover:scale-105 active:scale-90"
            aria-label="Create New Game"
          >
            <Plus size={32} />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;