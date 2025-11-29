// Location: src/lib/walletService.ts
// Complete replacement for your existing walletService.ts
// This version uses Wagmi + Farcaster wallet + Divvi tracking

import { getAccount, getBalance, sendTransaction, waitForTransactionReceipt, getChainId } from '@wagmi/core';
import { config } from '@/providers/WagmiProvider';
import { parseEther, formatEther } from 'viem';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk';

// Divvi Consumer ID for Memory Master
const DIVVI_CONSUMER_ID = import.meta.env.VITE_DIVVI_CONSUMER_ID || '0xB6Bb848A8E00b77698CAb1626C893dc8ddE4927c';

export interface WalletState {
    account: string;
    currentNetwork: string;
    isConnecting: boolean;
    balance: string;
    isLoadingBalance: boolean;
}

export interface WalletCallbacks {
    onWalletChange?: (address: string) => void;
    onToast?: (title: string, description: string) => void;
}

export class WalletService {
    private state: WalletState = {
        account: '',
        currentNetwork: '',
        isConnecting: false,
        balance: '',
        isLoadingBalance: false
    };
    private callbacks: WalletCallbacks = {};
    private stateUpdateCallback?: (state: WalletState) => void;

    constructor(callbacks?: WalletCallbacks) {
        this.callbacks = callbacks || {};
        this.initialize();
    }

    private updateState(updates: Partial<WalletState>) {
        this.state = { ...this.state, ...updates };
        this.stateUpdateCallback?.(this.state);
    }

    onStateUpdate(callback: (state: WalletState) => void) {
        this.stateUpdateCallback = callback;
        callback(this.state);
    }

    async fetchBalance(address: string) {
        if (!address) return;
        
        this.updateState({ isLoadingBalance: true });
        
        try {
            // Use wagmi's getBalance for CELO
            const balance = await getBalance(config, {
                address: address as `0x${string}`,
            });

            const formattedBalance = formatEther(balance.value);
            
            this.updateState({ 
                balance: parseFloat(formattedBalance).toFixed(4),
                isLoadingBalance: false
            });
        } catch (error) {
            console.error('Balance fetch error:', error);
            this.updateState({ 
                balance: '0.0000', 
                isLoadingBalance: false 
            });
        }
    }

    async checkNetwork() {
        try {
            const account = getAccount(config);
            
            if (account.chain) {
                const networkName = this.getNetworkName(account.chain.id);
                this.updateState({ currentNetwork: networkName });
            } else {
                this.updateState({ currentNetwork: 'Unknown' });
            }
        } catch (error) {
            console.error('Network check error:', error);
            this.updateState({ currentNetwork: 'Unknown' });
        }
    }

    private getNetworkName(chainId: number): string {
        const networks: Record<number, string> = {
            42220: 'Celo Mainnet',
            44787: 'Celo Alfajores Testnet',
            62320: 'Celo Baklava Testnet',
        };
        return networks[chainId] || `Chain ${chainId}`;
    }

    private showToast(title: string, description: string) {
        this.callbacks.onToast?.(title, description);
    }

    async connectWallet() {
        // With Farcaster Frame, wallet is automatically connected
        // We just need to retrieve the account information
        this.updateState({ isConnecting: true });
        
        try {
            const account = getAccount(config);
            
            if (account.address) {
                this.updateState({ account: account.address });
                this.callbacks.onWalletChange?.(account.address);
                
                // Fetch balance and check network
                await Promise.all([
                    this.fetchBalance(account.address),
                    this.checkNetwork()
                ]);
                
                localStorage.removeItem('wallet_disconnect_requested');
                this.showToast("Success", "Wallet connected successfully!");
            } else {
                throw new Error('No wallet found. Please open this app in Farcaster.');
            }
        } catch (error: any) {
            console.error('Connection error:', error);
            this.showToast("Error", error.message || "Failed to connect wallet");
        } finally {
            this.updateState({ isConnecting: false });
        }
    }

    async disconnectWallet() {
        localStorage.setItem('wallet_disconnect_requested', 'true');
        
        this.updateState({
            account: '',
            currentNetwork: '',
            balance: ''
        });
        
        this.callbacks.onWalletChange?.('');
        this.showToast("Success", "Wallet disconnected successfully!");
    }

    formatAddress(address: string): string {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    /**
     * Send payment with Divvi referral tracking
     * @param toAddress - Recipient CELO address
     * @param amountInCelo - Amount in CELO (e.g., "0.1")
     * @returns Promise<boolean> - True if successful
     */
    public async sendPayment(toAddress: string, amountInCelo: string): Promise<boolean> {
        const account = getAccount(config);
        
        if (!account.address) {
            throw new Error('Wallet not connected. Please connect your Farcaster wallet.');
        }

        try {
            // Validate recipient address format
            if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
                throw new Error('Invalid recipient address format');
            }

            // Convert CELO amount to wei (smallest unit)
            const amountInWei = parseEther(amountInCelo);

            // Check if user has sufficient balance
            const balance = await getBalance(config, {
                address: account.address,
            });

            if (balance.value < amountInWei) {
                throw new Error(`Insufficient balance. You need ${amountInCelo} CELO but only have ${formatEther(balance.value)} CELO.`);
            }

            // Generate Divvi referral tag for tracking
            const referralTag = getReferralTag({
                user: account.address,
                consumer: DIVVI_CONSUMER_ID,
            });

            console.log('🏷️ Divvi referral tag generated for user:', account.address);

            // Send transaction with Divvi tracking data
            const txHash = await sendTransaction(config, {
                to: toAddress as `0x${string}`,
                value: amountInWei,
                data: referralTag as `0x${string}`, // Append Divvi referral tag
            });

            this.showToast('Transaction Sent', 'Waiting for blockchain confirmation...');
            console.log('📤 Transaction submitted:', txHash);

            // Wait for transaction to be confirmed on-chain
            const receipt = await waitForTransactionReceipt(config, {
                hash: txHash,
            });

            if (receipt.status === 'success') {
                console.log('✅ Transaction confirmed:', txHash);

                // Submit referral to Divvi for reward distribution
                try {
                    const chainId = await getChainId(config);
                    
                    await submitReferral({
                        txHash: txHash,
                        chainId: chainId,
                    });
                    
                    console.log('✅ Divvi referral submitted successfully');
                    console.log('📊 Referral tracking data:', {
                        user: account.address,
                        txHash,
                        chainId,
                        consumer: DIVVI_CONSUMER_ID,
                    });
                } catch (divviError) {
                    console.error('⚠️ Divvi referral submission failed:', divviError);
                    // Don't block user flow - transaction still succeeded
                    // Divvi may retry or can be submitted manually
                }

                // Refresh user's balance
                await this.fetchBalance(account.address);
                
                this.showToast('Success', `Payment of ${amountInCelo} CELO completed!`);
                return true;
            } else {
                throw new Error('Transaction failed on blockchain');
            }
        } catch (error: any) {
            console.error('💥 Payment error:', error);
            
            // Handle specific error cases
            if (error.message?.includes('rejected') || 
                error.message?.includes('denied') || 
                error.message?.includes('User rejected')) {
                throw new Error('Transaction rejected by user');
            }
            
            if (error.message?.includes('insufficient funds')) {
                throw new Error('Insufficient CELO balance for transaction + gas fees');
            }
            
            // Generic error
            throw new Error(error.message || 'Payment failed. Please try again.');
        }
    }

    private async initialize() {
        try {
            // Check if user previously disconnected
            const wasDisconnected = localStorage.getItem('wallet_disconnect_requested');
            if (wasDisconnected === 'true') {
                console.log('User previously disconnected, not auto-connecting');
                return;
            }

            // Check if Farcaster wallet is available and connected
            const account = getAccount(config);
            
            if (account.address && account.isConnected) {
                console.log('🔗 Auto-connecting to Farcaster wallet:', account.address);
                
                this.updateState({ account: account.address });
                this.callbacks.onWalletChange?.(account.address);
                
                // Load network info and balance
                await this.checkNetwork();
                
                // Delay balance fetch slightly to ensure provider is ready
                setTimeout(() => {
                    if (account.address) {
                        this.fetchBalance(account.address);
                    }
                }, 100);
            } else {
                console.log('ℹ️ No Farcaster wallet connected on initialization');
            }
        } catch (error) {
            console.error('Failed to initialize wallet connection:', error);
        }
    }

    destroy() {
        // Cleanup method if needed for future use
        // Wagmi handles most cleanup internally
        console.log('🧹 WalletService cleanup');
    }
}