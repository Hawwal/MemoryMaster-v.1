import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  username: string;
  userHandle?: string;
  avatar?: string;
  score: number;
  level: number;
  date: string;
  fid?: string;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  filter: 'daily' | 'weekly' | 'all-time';
  onFilterChange: (filter: 'daily' | 'weekly' | 'all-time') => void;
  isLoading?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ 
  entries, 
  filter, 
  onFilterChange,
  isLoading = false 
}) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-semibold">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/20 border-yellow-500';
      case 2:
        return 'bg-gray-400/20 border-gray-400';
      case 3:
        return 'bg-amber-600/20 border-amber-600';
      default:
        return 'bg-muted border-border';
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-6 h-6 text-game-primary" />
          Leaderboard
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => onFilterChange('daily')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'daily'
                ? 'bg-game-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => onFilterChange('weekly')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'weekly'
                ? 'bg-game-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => onFilterChange('all-time')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all-time'
                ? 'bg-game-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-muted rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-muted-foreground/20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted-foreground/20 rounded w-1/3" />
                  <div className="h-3 bg-muted-foreground/20 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No entries yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Be the first to play and claim the top spot!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={`${entry.fid}-${entry.rank}`}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-md ${getRankBadgeColor(
                entry.rank
              )}`}
            >
              <div className="flex items-center justify-center w-10">
                {getRankIcon(entry.rank)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {entry.username}
                  </h3>
                  {entry.userHandle && (
                    <span className="text-xs text-muted-foreground">
                      @{entry.userHandle}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="font-medium text-game-primary">
                    {entry.score.toLocaleString()} pts
                  </span>
                  <span className="text-game-secondary">Level {entry.level}</span>
                  <span className="text-xs">{entry.date}</span>
                </div>
              </div>

              {entry.rank <= 3 && (
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};