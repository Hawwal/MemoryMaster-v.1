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
import { createClient } from '@supabase/supabase-js';
import sdk from '@farcaster/frame-sdk';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Your CELO wallet address to receive payments
const GAME_WALLET_ADDRESS = import.meta.env.VITE_GAME_WALLET_ADDRESS || '0xde25bf927c839355c66ee3551dae8a143bf85f9a';
const GAME_PRICE = import.meta.env.VITE_GAME_PRICE || '0.1';

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
    const [leaderboardFilter, setLeaderboardFilter] = useState<'daily' | 'weekly' | 'all-time'>('all-time');
    const [userName, setUserName] = useState('Player');
    const [userHandle, setUserHandle] = useState('player123');
    const [leaderboardEntries, setLeaderboardEntries] = useState<any[]>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [isPreparingPayment, setIsPreparingPayment] = useState(false);

    // Initialize Farcaster SDK
    useEffect(() => {
        const initializeFarcasterSdk = async () => {
            try {
                await sdk.actions.ready();
                console.log('✅ Farcaster SDK ready');
                
                // Get Farcaster user info
                const context = await sdk.context;
                if (context?.user) {
                    setUserName(context.user.displayName || context.user.username || 'Player');
                    setUserHandle(context.user.username || 'player');
                    
                    // Save to localStorage
                    localStorage.setItem('userName', context.user.displayName || context.user.username || 'Player');
                    localStorage.setItem('userHandle', context.user.username || 'player');
                    localStorage.setItem('fid', context.user.fid.toString());
                    
                    console.log('👤 Farcaster user:', context.user.username);
                }
            } catch (error) {
                console.error('Error initializing Farcaster SDK:', error);
            }
        };

        initializeFarcasterSdk();
    }, []);

    useEffect(() => {
        // Load user data from localStorage (fallback)
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

        // Load leaderboard data on mount
        fetchLeaderboard();

        return () => {
            walletService.destroy();
        };
    }, [toast]);

    // Helper function to format dates
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 24) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    // Fetch leaderboard from Supabase
    const fetchLeaderboard = async () => {
        setIsLoadingLeaderboard(true);
        try {
            let query = supabase
                .from('leaderboard')
                .select('*')
                .order('score', { ascending: false })
                .order('level', { ascending: false })
                .limit(100);

            // Apply time filters
            const now = new Date();
            if (leaderboardFilter === 'daily') {
                const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                query = query.gte('created_at', dayAgo.toISOString());
            } else if (leaderboardFilter === 'weekly') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                query = query.gte('created_at', weekAgo.toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;

            // Format entries with ranks
            const entries = (data || []).map((entry: any, index: number) => ({
                rank: index + 1,
                username: entry.username,
                userHandle: entry.user_handle,
                avatar: entry.avatar || '',
                score: entry.score,
                level: entry.level,
                date: formatDate(entry.created_at),
                fid: entry.fid
            }));

            setLeaderboardEntries(entries);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setLeaderboardEntries([]);
        } finally {
            setIsLoadingLeaderboard(false);
        }
    };

    // Re-fetch when filter changes
    useEffect(() => {
        fetchLeaderboard();
    }, [leaderboardFilter]);

    const connectWallet = () => {
        walletServiceRef.current?.connectWallet();
    };

    const disconnectWallet = () => {
        walletServiceRef.current?.disconnectWallet();
    };

    const formatAddress = (address: string) => {
        return walletServiceRef.current?.formatAddress(address) || '';
    };

    /**
     * CRITICAL FIX: Ensure wallet is connected before showing payment
     */
    const handleStartGame = async () => {
        // Check if wallet is already connected
        if (!walletState.account) {
            console.log('⚠️ Wallet not connected, connecting now...');
            setIsPreparingPayment(true);
            
            try {
                // Connect the wallet first
                await walletServiceRef.current?.connectWallet();
                
                // Wait for connection state to update
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if connection was successful by getting fresh state
                const currentAccount = walletState.account;
                
                if (!currentAccount) {
                    throw new Error('Failed to connect wallet. Please ensure you are using the app in Farcaster.');
                }
                
                console.log('✅ Wallet connected, preparing payment...');
            } catch (error: any) {
                console.error('Connection failed:', error);
                toast({
                    title: "Connection Failed",
                    description: error.message || "Failed to connect wallet. Please try again.",
                    variant: "destructive"
                });
                setIsPreparingPayment(false);
                return;
            }
        }

        // Wallet is connected, prepare for payment
        setIsPreparingPayment(true);
        
        try {
            console.log('🔄 Preparing payment - ensuring CELO mainnet connection...');
            
            // Force a network check to switch to CELO mainnet if needed
            await walletServiceRef.current?.checkNetwork();
            
            // Wait for network switch to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Refresh balance from CELO mainnet
            if (walletState.account) {
                await walletServiceRef.current?.fetchBalance(walletState.account);
            }
            
            // Wait for balance to load
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('✅ Payment preparation complete. Current balance:', walletState.balance, 'CELO');
            
            // Now show payment modal
            setGameState('payment');
        } catch (error: any) {
            console.error('Error preparing payment:', error);
            toast({
                title: "Connection Error",
                description: "Failed to prepare payment. Please ensure you're connected to CELO Mainnet.",
                variant: "destructive"
            });
        } finally {
            setIsPreparingPayment(false);
        }
    };

    const handlePayment = async () => {
        console.log('=== PAYMENT HANDLER START ===');
        console.log('Current wallet state:', walletState);
        
        setIsProcessingPayment(true);

        try {
            // Ensure wallet is still connected
            if (!walletState.account) {
                throw new Error('Wallet disconnected. Please reconnect and try again.');
            }

            // Log current state before payment
            console.log('💰 [handlePayment] Current state:');
            console.log('  - Account:', walletState.account);
            console.log('  - Game Wallet:', GAME_WALLET_ADDRESS);
            console.log('  - Network:', walletState.currentNetwork);
            console.log('  - Balance:', walletState.balance, 'CELO');
            console.log('  - Game Price:', GAME_PRICE, 'CELO');

            // Process actual CELO payment with Divvi tracking
            // The sendPayment method will handle all balance checks internally
            console.log('📤 [handlePayment] Calling sendPayment...');
            const success = await walletServiceRef.current?.sendPayment(
                GAME_WALLET_ADDRESS,
                GAME_PRICE
            );

            if (success) {
                toast({
                    title: "Payment Successful!",
                    description: `${GAME_PRICE} CELO sent successfully. Starting game...`
                });
                
                // Wait a moment for user to see success message
                setTimeout(() => {
                    setIsProcessingPayment(false);
                    setGameState('game');
                }, 1500);
            } else {
                throw new Error('Payment failed');
            }
        } catch (error: any) {
            console.error('❌ [handlePayment] Payment error:', error);
            toast({
                title: "Payment Failed",
                description: error.message || "Unable to process payment. Please try again.",
                variant: "destructive"
            });
            setIsProcessingPayment(false);
        }
    };

    const handlePaymentRequest = () => {
        setGameState('payment');
    };

    const handleGameEnd = async (score: number, level: number) => {
        setFinalScore(score);
        setFinalLevel(level);
        
        // Submit score to Supabase
        try {
            const fid = localStorage.getItem('fid') || `guest_${Date.now()}`;
            
            // Check if user already has a score
            const { data: existing, error: fetchError } = await supabase
                .from('leaderboard')
                .select('*')
                .eq('fid', fid)
                .maybeSingle();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            if (existing) {
                // Update if new score is higher
                if (score > existing.score || (score === existing.score && level > existing.level)) {
                    const { error: updateError } = await supabase
                        .from('leaderboard')
                        .update({
                            username: userName,
                            user_handle: userHandle,
                            score,
                            level,
                            updated_at: new Date().toISOString()
                        })
                        .eq('fid', fid);

                    if (updateError) throw updateError;
                    console.log('✅ Score updated successfully');
                }
            } else {
                // Insert new entry
                const { error: insertError } = await supabase
                    .from('leaderboard')
                    .insert({
                        fid,
                        username: userName,
                        user_handle: userHandle,
                        score,
                        level,
                        avatar: '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (insertError) throw insertError;
                console.log('✅ Score submitted successfully');
            }
            
            // Refresh leaderboard to show updated data
            await fetchLeaderboard();
        } catch (error) {
            console.error('❌ Error submitting score:', error);
        }
        
        setGameState('leaderboard');
    };

    const { account, currentNetwork, isConnecting, balance, isLoadingBalance } = walletState;
    const currentConfig = getNetworkConfig();

    if (gameState === 'splash') {
        return (
            <div className="relative">
                <SplashScreen onStartGame={handleStartGame} />
                {/* Show loading overlay when preparing payment */}
                {isPreparingPayment && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-card p-8 rounded-xl shadow-2xl max-w-sm mx-4">
                            <div className="flex flex-col items-center gap-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-game-primary border-t-transparent"></div>
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-foreground mb-1">Preparing Payment</p>
                                    <p className="text-sm text-muted-foreground">
                                        {!account ? 'Connecting wallet...' : 'Switching to CELO Mainnet...'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (gameState === 'payment') {
        return (
            <PaymentModal
                isOpen={true}
                onClose={() => setGameState('splash')}
                onPayment={handlePayment}
                isLoading={isProcessingPayment}
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
                        isLoading={isLoadingLeaderboard}
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
                            <h1 className="text-3xl font-bold text-foreground">Celo Wallet</h1>
                        </div>
                        <p className="text-muted-foreground">Connect to Celo network</p>
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