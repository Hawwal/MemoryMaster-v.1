export interface Polyomino {
  cells: number[][];
  size: number;
}

export interface GameState {
  level: number;
  score: number;
  lives: number;
  isPlaying: boolean;
  isMemorizing: boolean;
  isRecalling: boolean;
  currentShape: Polyomino | null;
  playerSelections: number[];
  accuracy: number;
}

export const generatePolyomino = (size: number): Polyomino => {
  const gridSize = 8;
  const cells: number[][] = [];
  
  // Start with a random cell
  const startX = Math.floor(Math.random() * gridSize);
  const startY = Math.floor(Math.random() * gridSize);
  cells.push([startX, startY]);
  
  while (cells.length < size) {
    const availableNeighbors: number[][] = [];
    
    cells.forEach(([x, y]) => {
      const neighbors = [
        [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]
      ];
      
      neighbors.forEach(([nx, ny]) => {
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
          const exists = cells.some(([cx, cy]) => cx === nx && cy === ny);
          if (!exists) {
            availableNeighbors.push([nx, ny]);
          }
        }
      });
    });
    
    if (availableNeighbors.length === 0) break;
    
    const randomNeighbor = availableNeighbors[Math.floor(Math.random() * availableNeighbors.length)];
    cells.push(randomNeighbor);
  }
  
  return { cells, size: cells.length };
};

export const calculateAccuracy = (correctCells: number[][], playerCells: number[]): number => {
  if (playerCells.length === 0) return 0;
  
  const correctPositions = correctCells.map(([x, y]) => x * 8 + y);
  const correctSelections = playerCells.filter(pos => correctPositions.includes(pos));
  const incorrectSelections = playerCells.filter(pos => !correctPositions.includes(pos));
  
  // Perfect match required: all correct cells selected AND no incorrect cells selected
  const isPerfect = correctSelections.length === correctPositions.length && incorrectSelections.length === 0;
  return isPerfect ? 1.0 : 0.0;
};

export const getMemorizationTime = (level: number): number => {
  return (level <= 7 ? 7 : 10) * 1000;
};

export const getRecallTime = (level: number): number => {
  return Math.max(10, 15 - Math.floor(level / 3)) * 1000;
};

export const getShapeSize = (level: number): number => {
  return Math.min(15, Math.max(4, 4 + Math.floor(level / 2)));
};
