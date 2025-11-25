import React from 'react';
import { Trophy, Calendar, Filter, User } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  score: number;
  level: number;
  date: string;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  filter: 'daily' | 'weekly' | 'all-time';
  onFilterChange: (filter: 'daily' | 'weekly' | 'all-time') => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  filter,
  onFilterChange
}) => {
  const filters = [
    { id: 'daily', label: 'Daily', icon: Calendar },
    { id: 'weekly', label: 'Weekly', icon: Filter },
    { id: 'all-time', label: 'All Time', icon: Trophy }
  ];

  return (
    <div className="bg-card rounded-lg p-6 shadow-lg border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Leaderboard</h2>
        <div className="flex gap-2">
          {filters.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onFilterChange(id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className="flex items-center justify-between p-3 bg-muted rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                {entry.rank}
              </div>
              <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium text-foreground">{entry.username}</div>
                <div className="text-sm text-muted-foreground">Level {entry.level} • {entry.date}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-game-primary">{entry.score.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">points</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
