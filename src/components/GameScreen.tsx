import React, { useState, useEffect, useRef } from 'react';
import { GameGrid } from './GameGrid';
import { GameHeader } from './GameHeader';
import { GameMenu } from './GameMenu';
import { GameOverScreen } from './GameOverScreen';
import { generatePolyomino, getMemorizationTime, getRecallTime, getShapeSize, calculateAccuracy } from '@/lib/gameLogic';
import { Timer, Target, CheckCircle, XCircle, Trophy, AlertCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Import music files
const backgroundMusic = '/music/background.mp3';
const correctSound = '/music/correct.mp3';
const incorrectSound = '/music/incorrect.mp3';

interface GameScreenProps {
  onGameEnd: (score: number, level: number) => void;
  userName: string;
  userHandle: string;
  onPaymentRequest: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ 
  onGameEnd, 
  userName, 
  userHandle,
  onPaymentRequest 
}) => {
  const [gameState, setGameState] = useState({
    level: 1,
    score: 0,
    lives: 3,
    isPlaying: true,
    isMemorizing: false,
    isRecalling: false,
    showingFeedback: false,
    currentShape: null as any,
    playerSelections: [] as number[],
    accuracy: 0,
    isPaused: false,
    gameOver: false,
    highestLevel: 1,
    levelWhenDied: 1,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<'memorizing' | 'recalling' | 'idle'>('idle');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showFailurePopup, setShowFailurePopup] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [levelPassed, setLevelPassed] = useState(false);
  const [showNextLevelButton, setShowNextLevelButton] = useState(false);
  const [levelFailed, setLevelFailed] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);

  const [savedTimerState, setSavedTimerState] = useState<{time: number, phase: 'memorizing' | 'recalling' | 'idle'}>({time: 0, phase: 'idle'});

  const isMobile = useIsMobile();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const answerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);
  
  const audioRefs = {
    background: useRef<HTMLAudioElement>(null),
    correct: useRef<HTMLAudioElement>(null),
    incorrect: useRef<HTMLAudioElement>(null),
  };

  useEffect(() => {
    isPausedRef.current = gameState.isPaused;
  }, [gameState.isPaused]);

  useEffect(() => {
    const savedHighestLevel = localStorage.getItem('highestLevel');
    if (savedHighestLevel) {
      setGameState(prev => ({ ...prev, highestLevel: parseInt(savedHighestLevel, 10) }));
    }

    const savedSound = localStorage.getItem('soundEnabled');
    const savedTheme = localStorage.getItem('darkMode');
    
    if (savedSound !== null) setIsSoundOn(savedSound === 'true');
    if (savedTheme !== null) setIsDarkMode(savedTheme === 'true');

    audioRefs.background.current = new Audio(backgroundMusic);
    audioRefs.correct.current = new Audio(correctSound);
    audioRefs.incorrect.current = new Audio(incorrectSound);
    
    if (audioRefs.background.current) {
      audioRefs.background.current.loop = true;
      audioRefs.background.current.volume = 0.3;
    }

    return () => {
      Object.values(audioRefs).forEach(ref => {
        if (ref.current) {
          ref.current.pause();
          ref.current = null;
        }
      });
      if (timerRef.current) clearInterval(timerRef.current);
      if (answerTimerRef.current) clearInterval(answerTimerRef.current);
      if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('soundEnabled', isSoundOn.toString());
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isSoundOn, isDarkMode]);

  useEffect(() => {
    if (audioRefs.background.current) {
      if (isSoundOn && gameState.isPlaying && !gameState.isPaused && !gameState.gameOver) {
        audioRefs.background.current.play().catch(console.error);
      } else {
        audioRefs.background.current.pause();
      }
    }
  }, [isSoundOn, gameState.isPlaying, gameState.isPaused, gameState.gameOver]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (gameState.level > gameState.highestLevel) {
      const newHighestLevel = gameState.level;
      setGameState(prev => ({ ...prev, highestLevel: newHighestLevel }));
      localStorage.setItem('highestLevel', newHighestLevel.toString());
    }
  }, [gameState.level, gameState.highestLevel]);

  const startMemorizationTimer = (duration: number) => {
    console.log('Starting memorization timer:', duration);
    setCountdownTimer(duration);
    setCurrentPhase('memorizing');
    
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdownTimer((prev) => {
        console.log('Memorization timer tick:', prev - 1);
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setCurrentPhase('idle');
          setTimeout(() => {
            if (!isPausedRef.current) {
              transitionToRecallPhase();
            }
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const transitionToRecallPhase = () => {
    if (isPausedRef.current) return;
    
    console.log('Transitioning to recall phase');
    setGameState(prev => ({
      ...prev,
      isMemorizing: false,
      isRecalling: true
    }));
    
    const recTime = Math.floor(getRecallTime(gameState.level) / 1000);
    console.log('Starting answer phase with timer:', recTime);
    startAnswerTimer(recTime);
  };

  const startAnswerTimer = (duration: number) => {
    console.log('Starting answer timer:', duration);
    setCountdownTimer(duration);
    setCurrentPhase('recalling');
    
    if (answerTimerRef.current) clearInterval(answerTimerRef.current);

    answerTimerRef.current = setInterval(() => {
      setCountdownTimer((prev) => {
        console.log('Answer timer tick:', prev - 1);
        if (prev <= 1) {
          clearInterval(answerTimerRef.current!);
          answerTimerRef.current = null;
          setCurrentPhase('idle');
          setTimeout(() => {
            if (!isPausedRef.current) {
              console.log('Answer timer expired, auto-submitting');
              evaluateSelection();
            }
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopAllTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (answerTimerRef.current) {
      clearInterval(answerTimerRef.current);
      answerTimerRef.current = null;
    }
    if (gameTimerRef.current) {
      clearTimeout(gameTimerRef.current);
      gameTimerRef.current = null;
    }
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startLevel = () => {
    if (isPausedRef.current || gameState.gameOver) return;

    console.log('Starting level:', gameState.level);
    
    const shapeSize = getShapeSize(gameState.level);
    const newShape = generatePolyomino(shapeSize);
    
    console.log('Generated shape:', newShape);

    setGameState(prev => ({
      ...prev,
      isMemorizing: true,
      isRecalling: false,
      showingFeedback: false,
      currentShape: newShape,
      playerSelections: []
    }));

    const memTime = Math.floor(getMemorizationTime(gameState.level) / 1000);
    console.log('Memorization time:', memTime);
    
    startMemorizationTimer(memTime);
  };

  const handleCellClick = (x: number, y: number) => {
    if (!gameState.isRecalling || isPausedRef.current || gameState.gameOver) return;
    
    console.log('Cell clicked:', x, y);
    const position = x * 8 + y;
    
    setGameState(prev => {
      const newSelections = prev.playerSelections.includes(position)
        ? prev.playerSelections.filter(p => p !== position)
        : [...prev.playerSelections, position];
      
      console.log('Updated selections:', newSelections);
      return { ...prev, playerSelections: newSelections };
    });
  };

  const evaluateSelection = () => {
    console.log('Evaluating selection');
    console.log('Current shape:', gameState.currentShape);
    console.log('Player selections:', gameState.playerSelections);
    
    const accuracy = calculateAccuracy(
      gameState.currentShape?.cells || [],
      gameState.playerSelections
    );
    
    console.log('Accuracy:', accuracy);
    
    const passed = accuracy === 1.0;
    
    stopAllTimers();
    
    if (isSoundOn) {
      const soundRef = passed ? audioRefs.correct : audioRefs.incorrect;
      if (soundRef.current) {
        soundRef.current.currentTime = 0;
        soundRef.current.play().catch(console.error);
      }
    }

    if (passed) {
      const roundScore = Math.floor(gameState.level * 100 * accuracy);
      setLastScore(roundScore);
      setLevelPassed(true);
      setLevelFailed(false);
       
      setGameState(prev => ({
        ...prev,
        accuracy,
        isMemorizing: false,
        isRecalling: false,
        showingFeedback: true
      }));
      
      setShowSuccessPopup(true);
    } else {
      const newLives = gameState.lives - 1;
      
      setGameState(prev => ({
        ...prev,
        accuracy,
        isMemorizing: false,
        isRecalling: false,
        showingFeedback: true,
        lives: newLives,
        levelWhenDied: newLives <= 0 ? prev.level : prev.levelWhenDied
      }));
      
      setLevelFailed(true);
      setLevelPassed(false);
      setShowFailurePopup(true);
    }
  };

  const handleSuccessNext = () => {
    setShowSuccessPopup(false);
    setLevelPassed(false);
    setLevelFailed(false);
    setShowNextLevelButton(false);
    
    setGameState(prev => ({
      ...prev,
      level: prev.level + 1,
      score: prev.score + lastScore,
      showingFeedback: false
    }));
    
    setTimeout(() => {
      startLevel();
    }, 500);
  };

  const handleFailureTryAgain = () => {
    setShowFailurePopup(false);
    setLevelFailed(false);
    setShowRetryButton(false);
    
    if (gameState.lives <= 0) {
      setGameState(prev => ({ 
        ...prev, 
        gameOver: true, 
        isPlaying: false,
        showingFeedback: false
      }));
    } else {
      setGameState(prev => ({ 
        ...prev, 
        showingFeedback: false 
      }));
      
      setTimeout(() => {
        startLevel();
      }, 500);
    }
  };

  const handleRetryLevel = () => {
    setShowRetryButton(false);
    setLevelFailed(false);
    
    if (gameState.lives <= 0) {
      setGameState(prev => ({ 
        ...prev, 
        gameOver: true, 
        isPlaying: false,
        showingFeedback: false
      }));
    } else {
      setGameState(prev => ({ 
        ...prev, 
        showingFeedback: false 
      }));
      
      setTimeout(() => {
        startLevel();
      }, 500);
    }
  };

  const togglePause = () => {
    if (gameState.gameOver) return;
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const pauseGame = () => {
    if (gameState.gameOver) return;
    
    setSavedTimerState({
      time: countdownTimer,
      phase: currentPhase
    });
    
    stopAllTimers();
    setGameState(prev => ({ ...prev, isPaused: true }));
  };

  const resumeGame = () => {
    if (gameState.gameOver) return;
    
    setGameState(prev => ({ ...prev, isPaused: false }));
    
    setTimeout(() => {
      if (savedTimerState.time > 0) {
        if (savedTimerState.phase === 'memorizing') {
          startMemorizationTimer(savedTimerState.time);
        } else if (savedTimerState.phase === 'recalling') {
          startAnswerTimer(savedTimerState.time);
        }
      } else if (savedTimerState.time === 0) {
        if (savedTimerState.phase === 'memorizing') {
          transitionToRecallPhase();
        } else if (savedTimerState.phase === 'recalling') {
          evaluateSelection();
        }
      }
      
      setSavedTimerState({ time: 0, phase: 'idle' });
    }, 50);
  };

  const handleRetry = () => {
    setGameState(prev => ({
      ...prev,
      lives: 3,
      level: prev.levelWhenDied,
      gameOver: false,
      isPlaying: true,
      showingFeedback: false,
      isMemorizing: false,
      isRecalling: false
    }));
    
    setTimeout(() => {
      startLevel();
    }, 1000);
  };

  const handleShare = () => {
    const shareText = `I scored ${gameState.score} points and reached level ${gameState.level} in Memory Challenge! Can you beat me?`;
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: 'Memory Challenge',
        text: shareText,
        url: shareUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
        alert('Link copied to clipboard!');
      }).catch(console.error);
    }
  };

  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused && !gameState.gameOver && 
        !gameState.isMemorizing && !gameState.isRecalling && !gameState.showingFeedback &&
        currentPhase === 'idle') {
      const timer = setTimeout(() => {
        startLevel();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameOver, gameState.isMemorizing, gameState.isRecalling, gameState.showingFeedback, currentPhase]);

  const grid = Array(8).fill(0).map(() => Array(8).fill(0));

  if (gameState.gameOver) {
    return (
      <GameOverScreen
        finalScore={gameState.score}
        highestLevel={gameState.level}
        onRetry={handleRetry}
        onBackToMenu={() => onGameEnd(gameState.score, gameState.level)}
      />
    );
  }

  return (
    <div className={isMobile ? "mobile-game-container bg-background" : "game-container bg-background"}>
      <div className="p-4 h-full flex flex-col">
        <GameHeader
          level={gameState.level}
          score={gameState.score}
          lives={gameState.lives}
          isPlaying={gameState.isPlaying}
          isPaused={gameState.isPaused}
          onMenuClick={() => { pauseGame(); setMenuOpen(true); }}
          onPauseClick={togglePause}
        />

        <div className="flex-1 flex items-center justify-center">
          <GameGrid
            grid={grid}
            onCellClick={handleCellClick}
            showShape={gameState.currentShape}
            playerSelections={gameState.playerSelections}
            isInteractive={gameState.isRecalling && !gameState.isPaused}
            isMemorizing={gameState.isMemorizing}
            isRecalling={gameState.isRecalling}
            showingFeedback={gameState.showingFeedback}
            correctCells={gameState.currentShape?.cells || []}
          />
        </div>

        <div className="text-center mt-4 min-h-[60px] flex items-center justify-center">
          {gameState.isMemorizing && (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Timer className="w-5 h-5" />
              <span className={`text-lg font-mono font-bold ${countdownTimer <= 3 ? 'text-red-500 animate-pulse' : ''}`}>
                Memorize: {formatTimer(countdownTimer)}
              </span>
            </div>
          )}
          
          {gameState.isRecalling && (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Target className="w-5 h-5" />
              <span className={`text-lg font-mono font-bold ${countdownTimer <= 3 ? 'text-red-500 animate-pulse' : ''}`}>
                Recreate: {formatTimer(countdownTimer)}
              </span>
            </div>
          )}

          {gameState.isPaused && (
            <div className="text-muted-foreground text-lg font-semibold">
              Game Paused
            </div>
          )}

          {!gameState.isMemorizing && !gameState.isRecalling && !gameState.showingFeedback && !gameState.isPaused && currentPhase === 'idle' && (
            <div className="text-muted-foreground text-lg font-semibold">
              Get Ready...
            </div>
          )}
        </div>

        {gameState.isRecalling && !gameState.isPaused && (
          <div className="text-center mt-4">
            <button
              onClick={() => {
                stopAllTimers();
                evaluateSelection();
              }}
              disabled={gameState.playerSelections.length === 0}
              className="submit-button"
            >
              Submit Answer
            </button>
          </div>
        )}

        <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 text-green-600">
                <Trophy className="w-6 h-6" />
                Correct!
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-center space-y-4">
              <div className="text-3xl font-bold text-green-600">
                +{lastScore} Points
              </div>
              <div className="text-muted-foreground">
                Accuracy: {Math.round(gameState.accuracy * 100)}%
              </div>
              <Button
                onClick={handleSuccessNext}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Next Level
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {showSuccessPopup === false && levelPassed && (
          <>
            {setTimeout(() => {
              if (levelPassed && !showSuccessPopup) {
                setShowNextLevelButton(true);
              }
            }, 100)}
          </>
        )}

        {showNextLevelButton && (
          <div className="text-center mt-4">
            <button
              onClick={handleSuccessNext}
              className="submit-button bg-green-600 hover:bg-green-700"
            >
              Continue to Level {gameState.level + 1}
            </button>
          </div>
        )}

        {showRetryButton && (
          <div className="text-center mt-4">
            <button
              onClick={handleRetryLevel}
              className="submit-button bg-red-600 hover:bg-red-700"
            >
              Retry Level {gameState.level}
            </button>
          </div>
        )}

        <Dialog open={showFailurePopup} onOpenChange={setShowFailurePopup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 text-red-600">
                <AlertCircle className="w-6 h-6" />
                Wrong Pattern!
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-center space-y-4">
              <div className="text-lg text-muted-foreground">
                Accuracy: {Math.round(gameState.accuracy * 100)}%
              </div>
              <div className="text-lg font-semibold">
                Lives remaining: {gameState.lives}
              </div>
              <Button
                onClick={handleFailureTryAgain}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Try Again
              </Button>
            </div>
            
            <div style={{ display: 'none' }}>
              {!showFailurePopup && levelFailed && setTimeout(() => {
                if (levelFailed && !showFailurePopup) {
                  if (gameState.lives <= 0) {
                    setGameState(prev => ({ 
                      ...prev, 
                      gameOver: true, 
                      isPlaying: false,
                      showingFeedback: false
                    }));
                  } else {
                    setShowRetryButton(true);
                  }
                }
              }, 100)}
            </div>
          </DialogContent>
        </Dialog>

        <GameMenu
          isOpen={menuOpen}
          onClose={() => { 
            setMenuOpen(false);
            setTimeout(() => {
              resumeGame();
            }, 50);
          }}
          isSoundOn={isSoundOn}
          onSoundToggle={setIsSoundOn}
          isDarkMode={isDarkMode}
          onThemeToggle={setIsDarkMode}
          onLeaderboardClick={() => {}}
          onShareClick={handleShare}
          userName={userName}
          userHandle={userHandle}
          highestLevel={gameState.highestLevel}
          currentScore={gameState.score}
        />

        <audio ref={audioRefs.background} />
        <audio ref={audioRefs.correct} />
        <audio ref={audioRefs.incorrect} />
      </div>
    </div>
  );
};