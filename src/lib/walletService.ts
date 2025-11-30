// Location: src/lib/walletService.ts
// Fixed version to ensure CELO mainnet balance is read correctly

import { getAccount, getBalance, sendTransaction, waitForTransactionReceipt, getChainId, estimateGas, getGasPrice, switchChain } from '@wagmi/core';
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
            
            if (currentChainId !== CELO_MAINNET_CHAIN_ID) {
                console.log(`⚠️ Current chain: ${currentChainId}, switching to CELO Mainnet (${CELO_MAINNET_CHAIN_ID})...`);
                await switchChain(config, { chainId: CELO_MAINNET_CHAIN_ID });
                console.log('✅ Switched to CELO Mainnet');
                
                // Wait a moment for the chain switch to complete
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                console.log('✅ Already on CELO Mainnet');
            }
        } catch (error) {
            console.error('❌ Failed to switch to CELO Mainnet:', error);
            throw new Error('Unable to switch to CELO Mainnet. Please switch networks manually in your wallet.');
        }
    }

    async fetchBalance(address: string) {
        if (!address) return;
        
        this.updateState({ isLoadingBalance: true });
        
        try {
            // CRITICAL: Ensure we're on CELO mainnet BEFORE fetching balance
            await this.ensureCeloMainnet();
            
            // Now fetch balance from CELO mainnet
            const balance = await getBalance(config, {
                address: address as `0x${string}`,
                chainId: CELO_MAINNET_CHAIN_ID,
            });

            const formattedBalance = formatEther(balance.value);
            
            console.log('💰 Fetched balance from CELO Mainnet:', formattedBalance, 'CELO');
            
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
            this.showToast("Error", "Failed to fetch balance. Please ensure you're on CELO Mainnet.");
        }
    }

    async checkNetwork() {
        try {
            const currentChainId = await getChainId(config);
            const networkName = this.getNetworkName(currentChainId);
            
            console.log('🌐 Current network:', networkName, `(Chain ID: ${currentChainId})`);
            
            this.updateState({ currentNetwork: networkName });
            
            // Always switch to CELO mainnet if not already there
            if (currentChainId !== CELO_MAINNET_CHAIN_ID) {
                console.log('⚠️ Not on CELO Mainnet, switching...');
                await this.ensureCeloMainnet();
                this.updateState({ currentNetwork: 'Celo Mainnet' });
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
            1: 'Ethereum Mainnet',
            8453: 'Base',
        };
        return networks[chainId] || `Chain ${chainId}`;
    }

    private showToast(title: string, description: string) {
        this.callbacks.onToast?.(title, description);
    }

    async connectWallet() {
        this.updateState({ isConnecting: true });
        
        try {
            const account = getAccount(config);
            
            if (account.address) {
                this.updateState({ account: account.address });
                this.callbacks.onWalletChange?.(account.address);
                
                // Ensure we're on CELO mainnet and fetch balance
                await this.checkNetwork();
                await this.fetchBalance(account.address);
                
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
     */
    public async sendPayment(toAddress: string, amountInCelo: string): Promise<boolean> {
        const account = getAccount(config);
        
        if (!account.address) {
            throw new Error('Wallet not connected. Please connect your Farcaster wallet.');
        }

        try {
            // Validate recipient address
            if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
                throw new Error('Invalid recipient address format');
            }

            // CRITICAL: Ensure we're on CELO mainnet BEFORE checking balance
            console.log('🔄 Ensuring we are on CELO Mainnet...');
            await this.ensureCeloMainnet();
            
            // Double-check we're on the right chain
            const currentChainId = await getChainId(config);
            console.log('🌐 Verified chain ID:', currentChainId);
            
            if (currentChainId !== CELO_MAINNET_CHAIN_ID) {
                throw new Error('Failed to switch to CELO Mainnet. Please try again.');
            }

            // Convert CELO amount to wei
            const amountInWei = parseEther(amountInCelo);

            // Get balance from CELO mainnet - this should now show correct balance
            const balance = await getBalance(config, {
                address: account.address,
                chainId: CELO_MAINNET_CHAIN_ID,
            });

            console.log('💰 CELO Mainnet Balance:', formatEther(balance.value), 'CELO');
            console.log('💸 Amount to send:', amountInCelo, 'CELO');

            // Generate Divvi referral tag
            const referralTag = getReferralTag({
                user: account.address,
                consumer: DIVVI_CONSUMER_ID,
            });

            console.log('🏷️ Divvi referral tag generated');

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
                console.log('⛽ Estimated gas:', estimatedGas.toString());
            } catch (gasError) {
                console.warn('⚠️ Gas estimation failed, using default:', gasError);
                estimatedGas = BigInt(100000);
            }

            // Get gas price
            const gasPrice = await getGasPrice(config, {
                chainId: CELO_MAINNET_CHAIN_ID,
            });
            console.log('💵 Gas price:', formatEther(gasPrice), 'CELO per gas');

            // Calculate costs
            const estimatedGasCost = estimatedGas * gasPrice;
            const totalRequired = amountInWei + estimatedGasCost;
            
            console.log('🔥 Estimated gas cost:', formatEther(estimatedGasCost), 'CELO');
            console.log('📊 Total required:', formatEther(totalRequired), 'CELO');
            console.log('📊 Your balance:', formatEther(balance.value), 'CELO');

            // Check if sufficient balance
            if (balance.value < totalRequired) {
                const deficit = totalRequired - balance.value;
                throw new Error(
                    `Insufficient balance. You need ${formatEther(totalRequired)} CELO total ` +
                    `(${amountInCelo} CELO + ${formatEther(estimatedGasCost)} CELO gas fees), ` +
                    `but you only have ${formatEther(balance.value)} CELO. ` +
                    `You're short ${formatEther(deficit)} CELO.`
                );
            }

            // Send transaction
            const txHash = await sendTransaction(config, {
                to: toAddress as `0x${string}`,
                value: amountInWei,
                data: referralTag as `0x${string}`,
                gas: estimatedGas,
                chainId: CELO_MAINNET_CHAIN_ID,
            });

            this.showToast('Transaction Sent', 'Waiting for confirmation...');
            console.log('📤 Transaction hash:', txHash);

            // Wait for confirmation
            const receipt = await waitForTransactionReceipt(config, {
                hash: txHash,
                chainId: CELO_MAINNET_CHAIN_ID,
            });

            if (receipt.status === 'success') {
                console.log('✅ Transaction confirmed:', txHash);
                console.log('⛽ Gas used:', receipt.gasUsed.toString());
                console.log('💵 Actual cost:', formatEther(receipt.gasUsed * gasPrice), 'CELO');

                // Submit to Divvi
                try {
                    await submitReferral({
                        txHash: txHash,
                        chainId: CELO_MAINNET_CHAIN_ID,
                    });
                    console.log('✅ Divvi referral submitted');
                } catch (divviError) {
                    console.error('⚠️ Divvi submission failed:', divviError);
                }

                // Refresh balance
                await this.fetchBalance(account.address);
                
                this.showToast('Success', `Payment of ${amountInCelo} CELO completed!`);
                return true;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error: any) {
            console.error('💥 Payment error:', error);
            
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
            const wasDisconnected = localStorage.getItem('wallet_disconnect_requested');
            if (wasDisconnected === 'true') {
                console.log('User previously disconnected');
                return;
            }

            const account = getAccount(config);
            
            if (account.address && account.isConnected) {
                console.log('🔗 Auto-connecting to Farcaster wallet:', account.address);
                
                this.updateState({ account: account.address });
                this.callbacks.onWalletChange?.(account.address);
                
                // Ensure on CELO mainnet and fetch balance
                setTimeout(async () => {
                    if (account.address) {
                        await this.checkNetwork();
                        await this.fetchBalance(account.address);
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    destroy() {
        console.log('🧹 WalletService cleanup');
    }
}