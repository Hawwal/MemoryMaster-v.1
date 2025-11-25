import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Waves as Wave, Wallet, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { WalletService, type WalletState } from '@/lib/walletService';
import { useToast } from '@/hooks/use-toast';
import CopyToClipboard from 'react-copy-to-clipboard';
import { getNetworkConfig } from '@/lib/config';
import { SplashScreen } from '@/components/SplashScreen';
import { GameScreen } from '@/components/GameScreen';
import { PaymentModal } from '@/components/PaymentModal';
import { Leaderboard } from '@/components/Leaderboard';

const Home = () => {
    const { toast } = useToast();
    const walletServiceRef = useRef<WalletService | null>(null);
    const [walletState, setWalletState] = useState<WalletState>({
        account: '',
        currentNetwork: '',
        isConnecting: false,
        balance: '',
        isLoadingBalance: false
    });
    const [gameState, setGameState] = useState<'splash' | 'payment' | 'game' | 'leaderboard'>('splash');
    const [finalScore, setFinalScore] = useState(0);
    const [finalLevel, setFinalLevel] = useState(1);
    const [leaderboardFilter, setLeaderboardFilter] = useState<'daily' | 'weekly' | 'all-time'>('daily');
    const [userName, setUserName] = useState('Player');
    const [userHandle, setUserHandle] = useState('player123');

    useEffect(() => {
        // Load user data from localStorage
        const savedUserName = localStorage.getItem('userName');
        const savedUserHandle = localStorage.getItem('userHandle');
        
        if (savedUserName) setUserName(savedUserName);
        if (savedUserHandle) setUserHandle(savedUserHandle);

        const walletService = new WalletService({
            onToast: (title: string, description: string) => {
                toast({ title, description });
            }
        });

        walletService.onStateUpdate(setWalletState);
        walletServiceRef.current = walletService;

        return () => {
            walletService.destroy();
        };
    }, [toast]);

    const connectWallet = () => {
        walletServiceRef.current?.connectWallet();
    };

    const disconnectWallet = () => {
        walletServiceRef.current?.disconnectWallet();
    };

    const formatAddress = (address: string) => {
        return walletServiceRef.current?.formatAddress(address) || '';
    };

    const handleStartGame = () => {
        if (!walletState.account) {
            connectWallet();
        } else {
            setGameState('payment');
        }
    };

    const handlePayment = () => {
        setGameState('game');
    };

    const handlePaymentRequest = () => {
        setGameState('payment');
    };

    const handleGameEnd = (score: number, level: number) => {
        setFinalScore(score);
        setFinalLevel(level);
        setGameState('leaderboard');
    };

    const { account, currentNetwork, isConnecting, balance, isLoadingBalance } = walletState;
    const currentConfig = getNetworkConfig();

    // Mock leaderboard data
    const leaderboardEntries = [
        { rank: 1, username: 'MemoryMaster', avatar: '', score: 2450, level: 15, date: 'Today' },
        { rank: 2, username: 'GridGuru', avatar: '', score: 1980, level: 12, date: 'Today' },
        { rank: 3, username: 'ShapeShifter', avatar: '', score: 1760, level: 11, date: 'Today' },
        { rank: 4, username: 'RecallKing', avatar: '', score: 1520, level: 10, date: 'Yesterday' },
        { rank: 5, username: 'PatternPro', avatar: '', score: 1340, level: 9, date: 'Yesterday' }
    ];

    if (gameState === 'splash') {
        return <SplashScreen onStartGame={handleStartGame} />;
    }

    if (gameState === 'payment') {
        return (
            <PaymentModal
                isOpen={true}
                onClose={() => setGameState('splash')}
                onPayment={handlePayment}
                isLoading={false}
            />
        );
    }

    if (gameState === 'game') {
        return (
            <GameScreen 
                onGameEnd={handleGameEnd} 
                userName={userName}
                userHandle={userHandle}
                onPaymentRequest={handlePaymentRequest}
            />
        );
    }

    if (gameState === 'leaderboard') {
        return (
            <div className="min-h-screen bg-background p-4">
                <div className="container mx-auto max-w-2xl">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-foreground mb-2">Game Over!</h2>
                        <p className="text-lg text-muted-foreground">
                            Final Score: <span className="font-bold text-game-primary">{finalScore.toLocaleString()}</span>
                        </p>
                        <p className="text-lg text-muted-foreground">
                            Highest Level: <span className="font-bold text-game-secondary">Level {finalLevel}</span>
                        </p>
                    </div>
                    <Leaderboard
                        entries={leaderboardEntries}
                        filter={leaderboardFilter}
                        onFilterChange={setLeaderboardFilter}
                    />
                    <div className="text-center mt-6">
                        <button
                            onClick={() => setGameState('splash')}
                            className="bg-game-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-game-primary/90 transition-colors"
                        >
                            Play Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="container mx-auto px-4 max-w-md">
                <div className="bg-card rounded-xl shadow-lg pt-3">
                    <div className="text-center">
                        <div className="flex items-center justify-center mt-5">
                            <Wave className="w-8 h-8 text-purple-500 mr-2" />
                            <h1 className="text-3xl font-bold text-foreground">Cello Wallet</h1>
                        </div>
                        <p className="text-muted-foreground">Connect to Cello network</p>
                    </div>
                    
                    <div className="flex items-center justify-center p-4">
                        <div className="max-w-md w-full">
                            {!account ? (
                                <div className="rounded-2xl p-2 text-center">
                                    <button 
                                        className="w-full bg-primary text-primary-foreground font-medium py-3 px-3 rounded-xl mb-3 flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
                                        onClick={connectWallet}
                                        disabled={isConnecting}
                                    >
                                        <Wallet size={20} />
                                        {isConnecting ? 'Connecting...' : 'Connect'}
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-muted rounded-2xl p-8">
                                    <h3 className="text-game-success font-medium mb-4 flex items-center gap-2">
                                        <CheckCircle size={20} />
                                        Wallet Connected
                                    </h3>
                                    
                                    <div className="mb-4">
                                        <label className="text-sm font-medium block mb-1">Account Address:</label>
                                        <div className="flex items-center bg-background p-2 rounded gap-2">
                                            <code className="flex-1 text-sm">{formatAddress(account)}</code>
                                            <CopyToClipboard 
                                                text={account}
                                                onCopy={() => toast({ title: "Copied!", description: "Address copied to clipboard" })}
                                            >
                                                <button className="p-1.5 border border-border rounded hover:bg-accent">
                                                    <Copy size={14} />
                                                </button>
                                            </CopyToClipboard>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="text-sm font-medium block mb-1">Balance:</label>
                                        <div className="flex items-center bg-background p-2 rounded border">
                                            {isLoadingBalance ? (
                                                <span className="text-sm text-muted-foreground">Loading...</span>
                                            ) : (
                                                <span className="text-sm font-mono">{balance} CELO</span>
                                            )}
                                        </div>
                                    </div>

                                    {currentNetwork && (
                                        <div className="mb-4">
                                            <label className="text-sm font-medium block mb-1">Network:</label>
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                                currentNetwork === currentConfig.name
                                                    ? 'bg-game-success/20 text-game-success' 
                                                    : 'bg-game-error/20 text-game-error'
                                            }`}>
                                                {currentNetwork === currentConfig.name ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                {currentNetwork}
                                            </span>
                                        </div>
                                    )}

                                    <hr className="my-4" />

                                    <div className="space-y-2">    
                                        <button 
                                            className="w-full bg-game-error hover:bg-game-error/90 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                                            onClick={disconnectWallet}
                                        >
                                            Disconnect Wallet
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    return (
        <>
            <Routes>
                <Route path="/" element={<Home />} />
            </Routes>
            <Toaster />
        </>
    );
};

export default App;
