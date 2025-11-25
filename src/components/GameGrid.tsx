import React from 'react';

interface GameGridProps {
  grid: number[][];
  onCellClick?: (x: number, y: number) => void;
  showShape?: any | null;
  playerSelections?: number[];
  isInteractive?: boolean;
  isMemorizing?: boolean;
  isRecalling?: boolean;
  showingFeedback?: boolean;
  correctCells?: number[][];
}

export const GameGrid: React.FC<GameGridProps> = ({
  grid,
  onCellClick,
  showShape,
  playerSelections = [],
  isInteractive = false,
  isMemorizing = false,
  isRecalling = false,
  showingFeedback = false,
  correctCells = []
}) => {
  const handleCellClick = (x: number, y: number) => {
    if (isInteractive && onCellClick) {
      onCellClick(x, y);
    }
  };

  const getCellState = (x: number, y: number): string => {
    const position = x * 8 + y;
    
    // Memorization phase - show shape in green
    if (isMemorizing && showShape?.cells.some(([cx, cy]: [number, number]) => cx === x && cy === y)) {
      return 'memorize';
    }
    
    // Recall phase - show player selections in blue
    if (isRecalling && playerSelections.includes(position)) {
      return 'selected';
    }
    
    // Feedback phase - show results with colors
    if (showingFeedback) {
      const isCorrectCell = correctCells.some(([cx, cy]) => cx === x && cy === y);
      const isPlayerSelected = playerSelections.includes(position);
      
      if (isCorrectCell && isPlayerSelected) {
        return 'correct'; // Green - correctly selected
      } else if (isCorrectCell && !isPlayerSelected) {
        return 'missed'; // Green with outline - should have been selected
      } else if (!isCorrectCell && isPlayerSelected) {
        return 'incorrect'; // Red - incorrectly selected
      }
    }
    
    return '';
  };

  const getCellClasses = (x: number, y: number): string => {
    const baseClasses = 'game-cell bg-white border-2 border-gray-200 transition-all duration-200';
    const state = getCellState(x, y);
    const hoverClasses = isInteractive && !playerSelections.includes(x * 8 + y) ? 'hover:bg-gray-100 cursor-pointer' : isInteractive ? 'cursor-pointer' : '';
    
    switch (state) {
      case 'memorize':
        return `${baseClasses} game-cell-memorize`;
      case 'selected':
        return `${baseClasses} game-cell-selected`;
      case 'correct':
        return `${baseClasses} game-cell-correct`;
      case 'incorrect':
        return `${baseClasses} game-cell-incorrect`;
      case 'missed':
        return `${baseClasses} game-cell-missed`;
      default:
        return `${baseClasses} ${hoverClasses}`;
    }
  };

  return (
    <div className="game-grid bg-gray-50 p-4 rounded-lg shadow-lg">
      {grid.map((row, x) =>
        row.map((_, y) => (
          <div
            key={`${x}-${y}`}
            className={getCellClasses(x, y)}
            onClick={() => handleCellClick(x, y)}
          />
        ))
      )}
    </div>
  );
};
