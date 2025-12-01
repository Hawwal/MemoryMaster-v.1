// Location: src/lib/walletService.ts
// DEBUGGED version with extensive logging to find the balance issue

import { getAccount, getBalance, sendTransaction, waitForTransactionReceipt, getChainId, estimateGas, getGasPrice, switchChain, watchAccount, reconnect } from '@wagmi/core';
import { config } from '@/providers/WagmiProvider';
import { parseEther, formatEther } from 'viem';
import { celo } from 'wagmi/chains';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk';

// Divvi Consumer ID for Memory Master
const DIVVI_CONSUMER_ID = import.meta.env.VITE_DIVVI_CONSUMER_ID || '0xB6Bb848A8E00b77698CAb1626C893dc8ddE4927c';

// CELO Mainnet Chain ID
const CELO_MAINNET_CHAIN_ID = 42220;

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
    private unwatchAccount?: () => void;

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

    /**
     * Ensures we're on CELO mainnet before any operation
     */
    private async ensureCeloMainnet(): Promise<void> {
        try {
            const currentChainId = await getChainId(config);
            console.log('🔍 [ensureCeloMainnet] Current chain ID:', currentChainId);
            
            if (currentChainId !== CELO_MAINNET_CHAIN_ID) {
                console.log(`⚠️ [ensureCeloMainnet] Not on CELO! Current: ${currentChainId}, Target: ${CELO_MAINNET_CHAIN_ID}`);
                console.log('🔄 [ensureCeloMainnet] Attempting to switch to CELO Mainnet...');
                
                await switchChain(config, { chainId: CELO_MAINNET_CHAIN_ID });
                console.log('✅ [ensureCeloMainnet] Switch command sent');
                
                // Wait for the chain switch to complete
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Verify the switch was successful
                const verifyChainId = await getChainId(config);
                console.log('🔍 [ensureCeloMainnet] Verification - Chain ID after switch:', verifyChainId);
                
                if (verifyChainId !== CELO_MAINNET_CHAIN_ID) {
                    throw new Error(`Failed to switch to CELO Mainnet. Still on chain ${verifyChainId}`);
                }
                
                console.log('✅ [ensureCeloMainnet] Successfully verified on CELO Mainnet');
            } else {
                console.log('✅ [ensureCeloMainnet] Already on CELO Mainnet');
            }
        } catch (error) {
            console.error('❌ [ensureCeloMainnet] Failed to switch to CELO Mainnet:', error);
            throw new Error('Unable to switch to CELO Mainnet. Please switch networks manually in your wallet.');
        }
    }

    async fetchBalance(address: string) {
        if (!address) {
            console.log('⚠️ [fetchBalance] No address provided');
            return;
        }
        
        console.log('💰 [fetchBalance] Starting balance fetch for:', address);
        this.updateState({ isLoadingBalance: true });
        
        try {
            // CRITICAL: Ensure we're on CELO mainnet BEFORE fetching balance
            console.log('🔄 [fetchBalance] Ensuring CELO mainnet...');
            await this.ensureCeloMainnet();
            
            // Double-check what chain we're actually on
            const currentChain = await getChainId(config);
            console.log('🔍 [fetchBalance] Fetching balance on chain:', currentChain);
            
            // Now fetch balance from CELO mainnet
            console.log('📡 [fetchBalance] Calling getBalance with chainId:', CELO_MAINNET_CHAIN_ID);
            const balance = await getBalance(config, {
                address: address as `0x${string}`,
                chainId: CELO_MAINNET_CHAIN_ID,
            });

            const formattedBalance = formatEther(balance.value);
            
            console.log('✅ [fetchBalance] Raw balance:', balance.value.toString());
            console.log('✅ [fetchBalance] Formatted balance:', formattedBalance, 'CELO');
            console.log('✅ [fetchBalance] Balance decimals:', balance.decimals);
            console.log('✅ [fetchBalance] Balance symbol:', balance.symbol);
            
            this.updateState({ 
                balance: parseFloat(formattedBalance).toFixed(4),
                isLoadingBalance: false
            });
        } catch (error) {
            console.error('❌ [fetchBalance] Balance fetch error:', error);
            this.updateState({ 
                balance: '0.0000', 
                isLoadingBalance: false 
            });
            this.showToast("Error", "Failed to fetch balance. Please ensure you're on CELO Mainnet.");
        }
    }

    async checkNetwork() {
        try {
            const currentChainId = await getChainId(config);
            const networkName = this.getNetworkName(currentChainId);
            
            console.log('🌐 [checkNetwork] Current network:', networkName, `(Chain ID: ${currentChainId})`);
            
            this.updateState({ currentNetwork: networkName });
            
            // Always switch to CELO mainnet if not already there
            if (currentChainId !== CELO_MAINNET_CHAIN_ID) {
                console.log('⚠️ [checkNetwork] Not on CELO Mainnet, switching...');
                await this.ensureCeloMainnet();
                this.updateState({ currentNetwork: 'Celo Mainnet' });
            }
        } catch (error) {
            console.error('❌ [checkNetwork] Network check error:', error);
            this.updateState({ currentNetwork: 'Unknown' });
        }
    }

    private getNetworkName(chainId: number): string {
        const networks: Record<number, string> = {
            42220: 'Celo Mainnet',
            44787: 'Celo Alfajores Testnet',
            62320: 'Celo Baklava Testnet',
            1: 'Ethereum Mainnet',
            8453: 'Base',
            10: 'Optimism',
        };
        return networks[chainId] || `Chain ${chainId}`;
    }

    private showToast(title: string, description: string) {
        this.callbacks.onToast?.(title, description);
    }

    async connectWallet() {
        console.log('🔌 [connectWallet] Starting wallet connection...');
        this.updateState({ isConnecting: true });
        
        try {
            // In Farcaster frames, the wallet is automatically connected
            // We just need to reconnect to ensure we have the latest state
            console.log('🔄 [connectWallet] Reconnecting to Farcaster wallet...');
            
            const connectors = await reconnect(config);
            console.log('🔗 [connectWallet] Reconnected connectors:', connectors);
            
            // Give it a moment to fully connect
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const account = getAccount(config);
            console.log('👤 [connectWallet] Account info:', {
                address: account.address,
                isConnected: account.isConnected,
                connector: account.connector?.name
            });
            
            if (account.address && account.isConnected) {
                console.log('✅ [connectWallet] Wallet connected:', account.address);
                this.updateState({ account: account.address });
                this.callbacks.onWalletChange?.(account.address);
                
                // CRITICAL: Ensure we're on CELO mainnet and fetch balance
                console.log('🔄 [connectWallet] Checking network...');
                await this.checkNetwork();
                
                console.log('💰 [connectWallet] Fetching balance...');
                await this.fetchBalance(account.address);
                
                localStorage.removeItem('wallet_disconnect_requested');
                this.showToast("Success", "Wallet connected successfully!");
            } else {
                throw new Error('No wallet found. Please open this app in Farcaster.');
            }
        } catch (error: any) {
            console.error('❌ [connectWallet] Connection error:', error);
            this.showToast("Error", error.message || "Failed to connect wallet");
        } finally {
            this.updateState({ isConnecting: false });
        }
    }

    async disconnectWallet() {
        console.log('🔌 [disconnectWallet] Disconnecting wallet...');
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
     */
    public async sendPayment(toAddress: string, amountInCelo: string): Promise<boolean> {
        console.log('💸 [sendPayment] Starting payment process...');
        console.log('💸 [sendPayment] To:', toAddress);
        console.log('💸 [sendPayment] Amount:', amountInCelo, 'CELO');
        
        const account = getAccount(config);
        
        console.log('👤 [sendPayment] Account check:', {
            address: account.address,
            isConnected: account.isConnected
        });
        
        if (!account.address || !account.isConnected) {
            throw new Error('Wallet not connected. Please connect your Farcaster wallet.');
        }

        try {
            // Validate recipient address
            if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
                throw new Error('Invalid recipient address format');
            }

            // CRITICAL: Ensure we're on CELO mainnet BEFORE checking balance
            console.log('🔄 [sendPayment] Ensuring we are on CELO Mainnet...');
            await this.ensureCeloMainnet();
            
            // Triple-check we're on the right chain
            const currentChainId = await getChainId(config);
            console.log('🌐 [sendPayment] Verified chain ID:', currentChainId);
            
            if (currentChainId !== CELO_MAINNET_CHAIN_ID) {
                throw new Error(`Failed to switch to CELO Mainnet. Currently on chain ${currentChainId}`);
            }

            // Convert CELO amount to wei
            const amountInWei = parseEther(amountInCelo);
            console.log('💰 [sendPayment] Amount in wei:', amountInWei.toString());

            // Get balance from CELO mainnet - this should now show correct balance
            console.log('📡 [sendPayment] Fetching balance from CELO mainnet...');
            const balance = await getBalance(config, {
                address: account.address,
                chainId: CELO_MAINNET_CHAIN_ID,
            });

            console.log('💰 [sendPayment] Raw balance value:', balance.value.toString());
            console.log('💰 [sendPayment] CELO Mainnet Balance:', formatEther(balance.value), 'CELO');
            console.log('💸 [sendPayment] Amount to send:', amountInCelo, 'CELO');

            // Generate Divvi referral tag
            const referralTag = getReferralTag({
                user: account.address,
                consumer: DIVVI_CONSUMER_ID,
            });

            console.log('🏷️ [sendPayment] Divvi referral tag generated');

            // Estimate gas
            let estimatedGas;
            try {
                estimatedGas = await estimateGas(config, {
                    account: account.address,
                    to: toAddress as `0x${string}`,
                    value: amountInWei,
                    data: referralTag as `0x${string}`,
                    chainId: CELO_MAINNET_CHAIN_ID,
                });
                console.log('⛽ [sendPayment] Estimated gas:', estimatedGas.toString());
            } catch (gasError) {
                console.warn('⚠️ [sendPayment] Gas estimation failed, using default:', gasError);
                estimatedGas = BigInt(100000);
            }

            // Get gas price
            const gasPrice = await getGasPrice(config, {
                chainId: CELO_MAINNET_CHAIN_ID,
            });
            console.log('💵 [sendPayment] Gas price:', formatEther(gasPrice), 'CELO per gas');

            // Calculate costs
            const estimatedGasCost = estimatedGas * gasPrice;
            const totalRequired = amountInWei + estimatedGasCost;
            
            console.log('🔥 [sendPayment] Estimated gas cost:', formatEther(estimatedGasCost), 'CELO');
            console.log('📊 [sendPayment] Total required:', formatEther(totalRequired), 'CELO');
            console.log('📊 [sendPayment] Your balance:', formatEther(balance.value), 'CELO');
            console.log('📊 [sendPayment] Balance >= Total?', balance.value >= totalRequired);

            // Check if sufficient balance
            if (balance.value < totalRequired) {
                const deficit = totalRequired - balance.value;
                const errorMsg = `Insufficient balance. You need ${formatEther(totalRequired)} CELO total ` +
                    `(${amountInCelo} CELO + ${formatEther(estimatedGasCost)} CELO gas fees), ` +
                    `but you only have ${formatEther(balance.value)} CELO. ` +
                    `You're short ${formatEther(deficit)} CELO.`;
                
                console.error('❌ [sendPayment] Insufficient balance:', errorMsg);
                throw new Error(errorMsg);
            }

            // Send transaction
            console.log('📤 [sendPayment] Sending transaction...');
            const txHash = await sendTransaction(config, {
                to: toAddress as `0x${string}`,
                value: amountInWei,
                data: referralTag as `0x${string}`,
                gas: estimatedGas,
                chainId: CELO_MAINNET_CHAIN_ID,
            });

            this.showToast('Transaction Sent', 'Waiting for confirmation...');
            console.log('📤 [sendPayment] Transaction hash:', txHash);

            // Wait for confirmation
            console.log('⏳ [sendPayment] Waiting for confirmation...');
            const receipt = await waitForTransactionReceipt(config, {
                hash: txHash,
                chainId: CELO_MAINNET_CHAIN_ID,
            });

            if (receipt.status === 'success') {
                console.log('✅ [sendPayment] Transaction confirmed:', txHash);
                console.log('⛽ [sendPayment] Gas used:', receipt.gasUsed.toString());
                console.log('💵 [sendPayment] Actual cost:', formatEther(receipt.gasUsed * gasPrice), 'CELO');

                // Submit to Divvi
                try {
                    await submitReferral({
                        txHash: txHash,
                        chainId: CELO_MAINNET_CHAIN_ID,
                    });
                    console.log('✅ [sendPayment] Divvi referral submitted');
                } catch (divviError) {
                    console.error('⚠️ [sendPayment] Divvi submission failed:', divviError);
                }

                // Refresh balance
                await this.fetchBalance(account.address);
                
                this.showToast('Success', `Payment of ${amountInCelo} CELO completed!`);
                return true;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error: any) {
            console.error('💥 [sendPayment] Payment error:', error);
            
            if (error.message?.includes('rejected') || 
                error.message?.includes('denied') || 
                error.message?.includes('User rejected')) {
                throw new Error('Transaction rejected by user');
            }
            
            if (error.message?.includes('Insufficient balance')) {
                throw error;
            }
            
            throw new Error(error.message || 'Payment failed. Please try again.');
        }
    }

    private async initialize() {
        try {
            console.log('🚀 [initialize] Starting WalletService initialization...');
            
            const wasDisconnected = localStorage.getItem('wallet_disconnect_requested');
            if (wasDisconnected === 'true') {
                console.log('⚠️ [initialize] User previously disconnected');
                return;
            }

            console.log('🔄 [initialize] Reconnecting to wallet...');
            
            // Reconnect to restore any existing connections
            await reconnect(config);
            
            // Wait a moment for reconnection
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const account = getAccount(config);
            console.log('👤 [initialize] Account after reconnect:', {
                address: account.address,
                isConnected: account.isConnected,
                connector: account.connector?.name
            });
            
            if (account.address && account.isConnected) {
                console.log('🔗 [initialize] Auto-connecting to Farcaster wallet:', account.address);
                
                this.updateState({ account: account.address });
                this.callbacks.onWalletChange?.(account.address);
                
                // Set up account watcher
                this.unwatchAccount = watchAccount(config, {
                    onChange: (account) => {
                        console.log('👀 [watchAccount] Account changed:', account.address);
                        if (account.address) {
                            this.updateState({ account: account.address });
                            this.callbacks.onWalletChange?.(account.address);
                            this.fetchBalance(account.address);
                        }
                    }
                });
                
                // Ensure on CELO mainnet
                console.log('🔄 [initialize] Checking network...');
                await this.checkNetwork();
                
                // Fetch balance after initialization
                setTimeout(() => {
                    if (account.address) {
                        console.log('💰 [initialize] Triggering balance fetch...');
                        this.fetchBalance(account.address);
                    }
                }, 1500);
            } else {
                console.log('⚠️ [initialize] No wallet connected on initialization');
            }
        } catch (error) {
            console.error('❌ [initialize] Initialization error:', error);
        }
    }

    destroy() {
        console.log('🧹 [destroy] WalletService cleanup');
        this.unwatchAccount?.();
    }
}