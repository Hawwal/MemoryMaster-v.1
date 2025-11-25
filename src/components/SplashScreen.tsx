import React from 'react';
import { Play, Grid, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface SplashScreenProps {
  onStartGame: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStartGame }) => {
  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? "mobile-game-container bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4" : "game-container bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4"}>
      <div className="w-full h-full flex items-center justify-center">
        {/* Background Game Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-16 h-16 border-2 border-game-primary/20 rounded-lg opacity-30"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                transform: `rotate(${Math.random() * 45}deg)`,
                animation: `pulse ${3 + Math.random() * 2}s infinite`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-xs mx-auto">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/logo/memory-master-logo.png" 
                alt="Memory Master"
                className="w-full max-w-[280px] h-auto object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            
            <p className="text-sm text-muted-foreground mb-4 px-2">
              Sharpen your memory—memorize, recreate, and conquer the leaderboard!
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Target className="w-6 h-6 text-game-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm mb-1">Memory Test</h3>
              <p className="text-xs text-muted-foreground">
                Memorize complex shapes in limited time
              </p>
            </div>
            
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Grid className="w-6 h-6 text-game-secondary mx-auto mb-2" />
              <h3 className="font-semibold text-sm mb-1">8×8 Grid</h3>
              <p className="text-xs text-muted-foreground">
                Precision gameplay on a classic grid
              </p>
            </div>
            
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Trophy className="w-6 h-6 text-game-warning mx-auto mb-2" />
              <h3 className="font-semibold text-sm mb-1">Leaderboard</h3>
              <p className="text-xs text-muted-foreground">
                Compete with players worldwide
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <Button
              onClick={onStartGame}
              size="lg"
              className="bg-gradient-to-r from-game-primary to-game-secondary hover:from-game-primary/90 hover:to-game-secondary/90 text-white px-6 py-4 text-base font-semibold rounded-xl transition-all transform hover:scale-105 w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Begin Challenge
            </Button>
            
            <p className="text-xs text-muted-foreground mt-3">
              Built by Hawwal on Celo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
