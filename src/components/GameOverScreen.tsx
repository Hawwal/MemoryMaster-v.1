import React from 'react';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface GameOverScreenProps {
  finalScore: number;
  highestLevel: number;
  onRetry: () => void;
  onBackToMenu: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  finalScore,
  highestLevel,
  onRetry,
  onBackToMenu
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? "mobile-game-container bg-background" : "game-container bg-background"}>
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-game-error rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Game Over!</h1>
            <p className="text-muted-foreground">Your adventure has ended</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-2xl font-bold text-game-primary mb-1">
                {finalScore.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Final Score</div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="text-2xl font-bold text-game-secondary mb-1">
                Level {highestLevel}
              </div>
              <div className="text-sm text-muted-foreground">Highest Level Reached</div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onRetry}
              size="lg"
              className="w-full bg-game-primary hover:bg-game-primary/90 text-white font-semibold py-3"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Pay 0.1 CELO to Continue
            </Button>

            <Button
              onClick={onBackToMenu}
              variant="outline"
              size="lg"
              className="w-full font-semibold py-3"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            Continue from Level {highestLevel} with 3 lives restored
          </div>
        </div>
      </div>
    </div>
  );
};
