import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  level: number;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  score,
  level
}) => {
  const [copied, setCopied] = useState(false);
  
  const gameUrl = window.location.href;
  const shareText = `I scored ${score.toLocaleString()} points and reached level ${level} in Memory Challenge! Can you beat me?`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(gameUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareUrls = {
    farcaster: `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText + ' ' + gameUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(gameUrl)}`,
    instagram: ''
  };

  const handleSocialShare = (platform: 'farcaster' | 'twitter' | 'instagram') => {
    if (platform === 'instagram') {
      navigator.clipboard.writeText(gameUrl).then(() => {
        alert('Link copied! Paste it in your Instagram bio or story.');
      });
    } else {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Share Your Progress</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Progress Summary */}
          <div className="bg-muted p-4 rounded-lg text-center">
            <div className="text-lg font-bold text-game-primary mb-1">
              Level {level} • {score.toLocaleString()} Points
            </div>
            <div className="text-sm text-muted-foreground">
              My Memory Challenge Progress
            </div>
          </div>

          {/* Copyable Link */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Copy Game Link</h3>
            <div className="flex gap-2">
              <Input
                value={gameUrl}
                readOnly
                className="text-xs"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button 
                onClick={handleCopyLink}
                size="icon"
                variant="outline"
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {copied && (
              <div className="text-xs text-green-500 font-medium">
                ✓ Link copied to clipboard!
              </div>
            )}
          </div>

          {/* Social Sharing */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Share Directly</h3>
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={() => handleSocialShare('farcaster')}
                variant="outline"
                className="w-full justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded" />
                  Share on Farcaster
                </div>
                <ExternalLink className="w-3 h-3" />
              </Button>
              
              <Button
                onClick={() => handleSocialShare('twitter')}
                variant="outline"
                className="w-full justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded" />
                  Share on Twitter/X
                </div>
                <ExternalLink className="w-3 h-3" />
              </Button>
              
              <Button
                onClick={() => handleSocialShare('instagram')}
                variant="outline"
                className="w-full justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded" />
                  Copy for Instagram
                </div>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
