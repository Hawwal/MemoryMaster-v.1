import React from 'react';
import { Heart, Trophy, Star, Menu, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameHeaderProps {
  level: number;
  score: number;
  lives: number;
  isPlaying: boolean;
  isPaused: boolean;
  onMenuClick: () => void;
  onPauseClick?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  level,
  score,
  lives,
  isPlaying,
  isPaused,
  onMenuClick,
  onPauseClick
}) => {
  return (
    <div className="bg-card rounded-lg p-4 shadow-sm border mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-game-warning" />
            <span className="text-sm font-medium">Level {level}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-game-primary" />
            <span className="text-sm font-medium">{score} pts</span>
          </div>
        </div>
        
        {isPlaying && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Heart
                  key={i}
                  className={`w-5 h-5 ${
                    i < lives ? 'text-game-error fill-game-error' : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onPauseClick || (() => {})}
              className="w-8 h-8"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="w-8 h-8"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
