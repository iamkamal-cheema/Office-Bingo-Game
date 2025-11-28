import React, { useState, useRef, useMemo } from 'react';
import { BingoGame, BingoCell } from '../types';
import { Check, X, Share2, Camera, Trash2, ImageIcon, AlertTriangle, Loader2 } from 'lucide-react';
import Confetti from './Confetti';

interface BingoBoardProps {
  game: BingoGame;
  onUpdateGame: (game: BingoGame) => void;
  onDeleteGame: () => void;
  onBack: () => void;
}

const BingoBoard: React.FC<BingoBoardProps> = ({ game, onUpdateGame, onDeleteGame, onBack }) => {
  // Use ID instead of object to avoid stale state issues
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const size = game.size;

  // Derive the active cell directly from the game prop to ensure we always have the latest data
  const activeCell = selectedCellId ? game.cells.find(c => c.id === selectedCellId) || null : null;

  // Calculate Winning Lines
  const { winStatus, isFullHouse } = useMemo(() => {
    const status = new Map<number, string[]>();
    // Get indices of all completed cells
    const completedIndices = new Set(
      game.cells
        .map((c, i) => (c.photos && c.photos.length > 0) ? i : -1)
        .filter(i => i !== -1)
    );

    const isFull = game.cells.length > 0 && completedIndices.size === game.cells.length;

    // Helper to register a win for a set of indices
    const checkLine = (indices: number[], type: string) => {
      if (indices.every(i => completedIndices.has(i))) {
        indices.forEach(i => {
          const current = status.get(i) || [];
          if (!current.includes(type)) current.push(type);
          status.set(i, current);
        });
        return true;
      }
      return false;
    };

    // 1. Rows
    for (let r = 0; r < size; r++) {
      const rowIndices = Array.from({ length: size }, (_, c) => r * size + c);
      checkLine(rowIndices, 'row');
    }

    // 2. Columns
    for (let c = 0; c < size; c++) {
      const colIndices = Array.from({ length: size }, (_, r) => r * size + c);
      checkLine(colIndices, 'col');
    }

    // 3. Diagonals
    const d1 = Array.from({ length: size }, (_, i) => i * size + i); // TL to BR
    checkLine(d1, 'diag');

    const d2 = Array.from({ length: size }, (_, i) => (i + 1) * size - (i + 1)); // TR to BL
    checkLine(d2, 'diag');

    return { winStatus: status, isFullHouse: isFull };
  }, [game.cells, size]);


  const handleCellClick = (cellId: string) => {
    setSelectedCellId(cellId);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          // Resize logic
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG at 70% quality to save space
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedCellId) {
      setIsProcessingImg(true);
      try {
        const compressedBase64 = await compressImage(file);
        addPhoto(selectedCellId, compressedBase64);
        
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error("Image processing failed", error);
        alert("Failed to process image. Please try again.");
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const addPhoto = (cellId: string, photoUrl: string) => {
    const newCells = game.cells.map(c => {
      if (c.id === cellId) {
        const currentPhotos = c.photos || [];
        return { 
          ...c, 
          photos: [...currentPhotos, photoUrl], 
          completedAt: Date.now() 
        };
      }
      return c;
    });
    
    updateGameState(newCells, true);
  };

  const removePhoto = (cellId: string, photoIndex: number) => {
    const newCells = game.cells.map(c => {
      if (c.id === cellId && c.photos) {
        // Create a copy and splice to ensure robust removal
        const newPhotos = [...c.photos];
        newPhotos.splice(photoIndex, 1);
        
        return { 
          ...c, 
          photos: newPhotos,
          // If no photos left, remove completedAt timestamp
          completedAt: newPhotos.length > 0 ? c.completedAt : undefined
        };
      }
      return c;
    });
    
    updateGameState(newCells, false);
  };

  const updateGameState = (newCells: BingoCell[], triggerConfetti: boolean) => {
    const newGame = { ...game, cells: newCells };
    onUpdateGame(newGame);

    if (triggerConfetti) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const handleShare = async () => {
    const gameTemplate = {
        ...game,
        id: Date.now().toString(),
        cells: game.cells.map(c => ({ 
            ...c, 
            photos: [], 
            completedAt: undefined 
        })),
        createdAt: Date.now()
    };

    const gameString = JSON.stringify(gameTemplate);
    const encoded = btoa(encodeURIComponent(gameString));
    const shareUrl = `${window.location.origin}${window.location.pathname}?import=${encoded}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my Bingo: ${game.title}`,
          text: `I challenge you to this Bingo Snap game! Click to play:`,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Game link copied! Send it to friends to challenge them.");
    }
  };

  const handleDeleteConfirm = () => {
    onDeleteGame();
  };

  const gridStyle = {
    gridTemplateColumns: `repeat(${game.size}, minmax(0, 1fr))`,
  };

  // Helper to determine cell styling
  const getCellStyle = (hasPhotos: boolean, wins: string[], isFullHouse: boolean) => {
    if (!hasPhotos) {
      return {
        classes: 'border-white bg-white hover:border-brand-300 hover:shadow-md',
        iconColor: 'text-gray-300'
      };
    }

    if (isFullHouse) {
      return {
        classes: 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200 shadow-lg shadow-yellow-100/50',
        iconColor: 'text-yellow-600'
      };
    }

    if (wins.length > 1) {
      return {
        classes: 'border-pink-500 bg-pink-50 ring-2 ring-pink-100 shadow-md',
        iconColor: 'text-pink-600'
      };
    }

    if (wins.includes('diag')) {
      return {
        classes: 'border-orange-500 bg-orange-50 shadow-sm',
        iconColor: 'text-orange-600'
      };
    }

    if (wins.includes('col')) {
      return {
        classes: 'border-purple-500 bg-purple-50 shadow-sm',
        iconColor: 'text-purple-600'
      };
    }

    if (wins.includes('row')) {
      return {
        classes: 'border-blue-500 bg-blue-50 shadow-sm',
        iconColor: 'text-blue-600'
      };
    }

    // Default completed (no line yet)
    return {
      classes: 'border-green-500 bg-green-50',
      iconColor: 'text-green-600'
    };
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      {showConfetti && <Confetti />}

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="text-gray-600 hover:text-brand-600 font-medium flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            &larr; Back
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Delete Game"
            >
              <Trash2 size={20} />
            </button>
            
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-full hover:bg-brand-700 shadow-md transition-all active:scale-95 font-medium text-sm"
              title="Invite Friends"
            >
              <Share2 size={18} />
              <span>Invite Friends</span>
            </button>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">{game.title}</h2>
          <p className="text-sm text-gray-500">Snap photos to complete the board!</p>
        </div>
      </div>
      
      {/* Delete Confirmation Alert */}
      {showDeleteConfirm && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3 text-red-800">
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">Delete this game permanently?</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleDeleteConfirm}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pb-8">
        <div 
          className="grid gap-2 sm:gap-4 w-full aspect-square max-h-[80vh] mx-auto"
          style={gridStyle}
        >
          {game.cells.map((cell, index) => {
            const hasPhotos = cell.photos && cell.photos.length > 0;
            const lastPhoto = hasPhotos ? cell.photos![cell.photos!.length - 1] : null;
            const photoCount = cell.photos?.length || 0;
            const wins = winStatus.get(index) || [];
            
            const { classes, iconColor } = getCellStyle(!!hasPhotos, wins, isFullHouse);

            return (
              <button
                key={cell.id}
                onClick={() => handleCellClick(cell.id)}
                className={`
                  relative rounded-xl border-2 flex flex-col items-center justify-center p-1 sm:p-2 text-center transition-all duration-200 overflow-hidden group
                  bingo-cell-enter
                  ${classes}
                `}
                style={{ animationDelay: `${index * 0.02}s` }}
              >
                {lastPhoto ? (
                  <>
                    <img 
                      src={lastPhoto} 
                      alt="Latest snap" 
                      className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-40" 
                    />
                    <div className="relative z-10 bg-white/90 p-1 rounded-full shadow-sm">
                      <Check className={`${iconColor} w-4 h-4 sm:w-6 sm:h-6`} />
                    </div>
                    
                    {photoCount > 1 && (
                      <div className="absolute top-1 right-1 z-10 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                        +{photoCount - 1}
                      </div>
                    )}
                    
                    <span className={`relative z-10 text-[10px] sm:text-xs font-semibold mt-1 line-clamp-2 px-1 bg-white/60 backdrop-blur-sm rounded-md ${iconColor}`}>
                      {cell.text}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-700 line-clamp-4 leading-tight">
                      {cell.text}
                    </span>
                    {index === Math.floor((game.size * game.size) / 2) && game.size === 5 && !cell.text.includes("FREE") && (
                       <span className="absolute bottom-1 right-1 text-[8px] sm:text-[10px] text-brand-400 font-bold opacity-50">#{index+1}</span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload/Gallery Modal */}
      {activeCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setSelectedCellId(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 bg-white/80 rounded-full p-1 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 pr-8 line-clamp-2">{activeCell.text}</h3>
              <p className="text-sm text-gray-500">
                {(activeCell.photos?.length || 0)} photo{(activeCell.photos?.length || 0) !== 1 && 's'} collected
              </p>
            </div>

            {/* Photo Gallery */}
            <div 
              className="flex-1 overflow-y-auto mb-6 min-h-[150px]"
              key={activeCell.photos?.length || 0} // Force re-render grid on count change to sync UI
            >
               {(!activeCell.photos || activeCell.photos.length === 0) ? (
                 <div className="h-48 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                    <ImageIcon size={48} className="mb-2 opacity-50" />
                    <p>No photos yet. Snap the first one!</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 gap-3">
                   {activeCell.photos.map((photo, idx) => (
                     // Key mixing index and slice ensures stability but allows React to detect changes
                     <div key={`${idx}-${photo.slice(-15)}`} className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-gray-100 group/photo">
                       <img src={photo} alt={`Snap ${idx+1}`} className="w-full h-full object-cover" />
                       
                       {/* Delete Button */}
                       <div className="absolute top-2 right-2 z-20">
                         <button
                           type="button"
                           onClick={(e) => {
                             e.preventDefault();
                             e.stopPropagation(); // Critical: stop event from bubbling to overlays
                             removePhoto(activeCell.id, idx);
                           }}
                           className="flex items-center justify-center w-10 h-10 bg-white text-red-500 rounded-full hover:bg-red-50 hover:text-red-600 shadow-md border border-gray-200 cursor-pointer active:scale-90 transition-transform"
                           title="Delete photo"
                           aria-label="Delete photo"
                         >
                            <Trash2 size={20} className="pointer-events-none" />
                         </button>
                       </div>

                       <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2 pointer-events-none">
                         <span className="text-white text-xs font-medium px-1">#{idx + 1}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>

            {/* Actions */}
            <div className="space-y-3 mt-auto">
              <label className={`flex items-center justify-center gap-3 w-full p-4 bg-brand-600 text-white rounded-xl font-semibold cursor-pointer hover:bg-brand-700 transition-transform active:scale-95 shadow-lg shadow-brand-200 select-none ${isProcessingImg ? 'opacity-70 cursor-wait pointer-events-none' : ''}`}>
                {isProcessingImg ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <Camera size={24} />
                )}
                <span>
                  {isProcessingImg ? "Compressing..." : 
                    (!activeCell.photos || activeCell.photos.length === 0) 
                    ? "Take Photo / Upload" 
                    : "Add Another Photo"
                  }
                </span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={isProcessingImg}
                />
              </label>
              
              <button 
                onClick={() => setSelectedCellId(null)}
                className="w-full p-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                disabled={isProcessingImg}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BingoBoard;