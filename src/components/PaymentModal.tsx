import React from 'react';
import { X, Wallet, Coins } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayment: () => void;
  isLoading: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPayment,
  isLoading
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-game-primary" />
            Enter the Game
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Entry Fee</span>
              <span className="font-bold text-game-primary">0.1 CELO</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Network</span>
              <span className="text-sm">Celo Mainnet</span>
            </div>
          </div>
          
          <div className="bg-game-primary/10 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-game-primary">
              <Wallet className="w-4 h-4" />
              Connect your Farcaster wallet to play
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onPayment}
              disabled={isLoading}
              className="flex-1 bg-game-primary hover:bg-game-primary/90"
            >
              {isLoading ? 'Processing...' : 'Pay & Play'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
