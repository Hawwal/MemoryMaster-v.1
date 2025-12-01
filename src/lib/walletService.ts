// Location: src/lib/walletService.ts
// ULTIMATE FIX: Use direct RPC calls to CELO to bypass wallet chain issues

import { getAccount, sendTransaction, waitForTransactionReceipt, getChainId, estimateGas, getGasPrice, switchChain, watchAccount, reconnect } from '@wagmi/core';
import { config } from '@/providers/WagmiProvider';
import { parseEther, formatEther, createPublicClient, http } from 'viem';
import { celo } from 'wagmi/chains';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk';

// Divvi Consumer ID for Memory Master
const DIVVI_CONSUMER_ID = import.meta.env.VITE_DIVVI_CONSUMER_ID || '0xB6Bb848A8E00b77698CAb1626C893dc8ddE4927c';

// CELO Mainnet Chain ID
const CELO_MAINNET_CHAIN_ID = 42220;

// Create a direct public client for CELO mainnet
// This bypasses the wallet's current chain and reads directly from CELO
const celoPublicClient = createPublicClient({
  chain: celo,
  transport: http('https://forno.celo.org'),
});

console.log('✅ Created direct CELO public client');

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
                console.log(`⚠️ [ensureCeloMainnet] Not on CELO! Switching from ${currentChainId} to ${CELO_MAINNET_CHAIN_ID}...`);
                
                await switchChain(config, { chainId: CELO_MAINNET_CHAIN_ID });
                console.log('✅ [ensureCeloMainnet] Switch command sent');
                
                // Wait longer for chain switch
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Verify the switch
                const verifyChainId = await getChainId(config);
                console.log('🔍 [ensureCeloMainnet] Chain ID after switch:', verifyChainId);
                
                if (verifyChainId !== CELO_MAINNET_CHAIN_ID) {
                    console.error(`❌ [ensureCeloMainnet] Switch failed! Still on chain ${verifyChainId}`);
                    throw new Error(`Failed to switch to CELO Mainnet. Still on chain ${verifyChainId}`);
                }
                
                console.log('✅ [ensureCeloMainnet] Successfully verified on CELO Mainnet');
            } else {
                console.log('✅ [ensureCeloMainnet] Already on CELO Mainnet');
            }
        } catch (error) {
            console.error('❌ [ensureCeloMainnet] Error:', error);
            throw new Error('Unable to switch to CELO Mainnet.');
        }
    }

    /**
     * CRITICAL FIX: Fetch balance directly from CELO chain using public client
     * This bypasses wallet chain switching issues
     */
    async fetchBalance(address: string) {
        if (!address) {
            console.log('⚠️ [fetchBalance] No address provided');
            return;
        }
        
        console.log('💰 [fetchBalance] Fetching CELO balance for:', address);
        this.updateState({ isLoadingBalance: true });
        
        try {
            // CRITICAL: Use direct CELO public client instead of wagmi getBalance
            // This reads from CELO mainnet regardless of wallet's current chain
            console.log('📡 [fetchBalance] Calling CELO RPC directly via public client...');
            
            const balance = await celoPublicClient.getBalance({
                address: address as `0x${string}`,
            });

            const formattedBalance = formatEther(balance);
            
            console.log('✅ [fetchBalance] Raw balance from CELO:', balance.toString(), 'wei');
            console.log('✅ [fetchBalance] Formatted balance:', formattedBalance, 'CELO');
            
            this.updateState({ 
                balance: parseFloat(formattedBalance).toFixed(4),
                isLoadingBalance: false
            });
            
            return formattedBalance;
        } catch (error) {
            console.error('❌ [fetchBalance] Error fetching balance:', error);
            this.updateState({ 
                balance: '0.0000', 
                isLoadingBalance: false 
            });
            this.showToast("Error", "Failed to fetch CELO balance");
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
            console.error('❌ [checkNetwork] Error:', error);
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
        console.log('🔌 [connectWallet] Starting connection...');
        this.updateState({ isConnecting: true });
        
        try {
            console.log('🔄 [connectWallet] Reconnecting...');
            await reconnect(config);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const account = getAccount(config);
            console.log('👤 [connectWallet] Account:', {
                address: account.address,
                isConnected: account.isConnected,
            });
            
            if (account.address && account.isConnected) {
                console.log('✅ [connectWallet] Connected:', account.address);
                this.updateState({ account: account.address });
                this.callbacks.onWalletChange?.(account.address);
                
                // Switch to CELO mainnet
                await this.checkNetwork();
                
                // Fetch balance using direct CELO client
                await this.fetchBalance(account.address);
                
                localStorage.removeItem('wallet_disconnect_requested');
                this.showToast("Success", "Wallet connected successfully!");
            } else {
                throw new Error('No wallet found. Please open this app in Farcaster.');
            }
        } catch (error: any) {
            console.error('❌ [connectWallet] Error:', error);
            this.showToast("Error", error.message || "Failed to connect wallet");
        } finally {
            this.updateState({ isConnecting: false });
        }
    }

    async disconnectWallet() {
        console.log('🔌 [disconnectWallet] Disconnecting...');
        localStorage.setItem('wallet_disconnect_requested', 'true');
        
        this.updateState({
            account: '',
            currentNetwork: '',
            balance: ''
        });
        
        this.callbacks.onWalletChange?.('');
        this.showToast("Success", "Wallet disconnected!");
    }

    formatAddress(address: string): string {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    /**
     * Send payment on CELO mainnet with Divvi tracking
     */
    public async sendPayment(toAddress: string, amountInCelo: string): Promise<boolean> {
        console.log('💸 [sendPayment] Starting payment...');
        console.log('💸 [sendPayment] To:', toAddress);
        console.log('💸 [sendPayment] Amount:', amountInCelo, 'CELO');
        
        const account = getAccount(config);
        
        if (!account.address || !account.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            // Validate recipient
            if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
                throw new Error('Invalid recipient address');
            }

            // CRITICAL: Switch to CELO mainnet
            console.log('🔄 [sendPayment] Ensuring CELO mainnet...');
            await this.ensureCeloMainnet();
            
            // Verify chain
            const currentChainId = await getChainId(config);
            console.log('🌐 [sendPayment] Current chain:', currentChainId);
            
            if (currentChainId !== CELO_MAINNET_CHAIN_ID) {
                throw new Error(`Must be on CELO Mainnet. Currently on chain ${currentChainId}`);
            }

            const amountInWei = parseEther(amountInCelo);
            console.log('💰 [sendPayment] Amount in wei:', amountInWei.toString());

            // Fetch balance directly from CELO using public client
            console.log('📡 [sendPayment] Fetching balance from CELO...');
            const balance = await celoPublicClient.getBalance({
                address: account.address as `0x${string}`,
            });

            console.log('💰 [sendPayment] CELO Balance:', formatEther(balance), 'CELO');
            console.log('💸 [sendPayment] Amount to send:', amountInCelo, 'CELO');

            // Generate Divvi tag
            let referralTag = getReferralTag({
                user: account.address,
                consumer: DIVVI_CONSUMER_ID,
            });
            
            // CRITICAL FIX: Ensure referral tag has 0x prefix
            if (referralTag && !referralTag.startsWith('0x')) {
                referralTag = `0x${referralTag}`;
                console.log('🔧 [sendPayment] Added 0x prefix to referral tag');
            }
            
            console.log('🏷️ [sendPayment] Referral tag:', referralTag);

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
                console.warn('⚠️ [sendPayment] Gas estimation failed:', gasError);
                estimatedGas = BigInt(100000);
            }

            // Get gas price
            const gasPrice = await getGasPrice(config, {
                chainId: CELO_MAINNET_CHAIN_ID,
            });
            console.log('💵 [sendPayment] Gas price:', formatEther(gasPrice));

            // Calculate total cost
            const estimatedGasCost = estimatedGas * gasPrice;
            const totalRequired = amountInWei + estimatedGasCost;
            
            console.log('🔥 [sendPayment] Gas cost:', formatEther(estimatedGasCost), 'CELO');
            console.log('📊 [sendPayment] Total needed:', formatEther(totalRequired), 'CELO');
            console.log('📊 [sendPayment] Your balance:', formatEther(balance), 'CELO');

            // Check balance
            if (balance < totalRequired) {
                const deficit = totalRequired - balance;
                throw new Error(
                    `Insufficient CELO balance. Need ${formatEther(totalRequired)} CELO ` +
                    `(${amountInCelo} + ${formatEther(estimatedGasCost)} gas), ` +
                    `but have ${formatEther(balance)} CELO. ` +
                    `Short ${formatEther(deficit)} CELO.`
                );
            }

            // Send transaction
            console.log('📤 [sendPayment] Sending...');
            const txHash = await sendTransaction(config, {
                to: toAddress as `0x${string}`,
                value: amountInWei,
                data: referralTag as `0x${string}`,
                gas: estimatedGas,
                chainId: CELO_MAINNET_CHAIN_ID,
            });

            this.showToast('Transaction Sent', 'Waiting for confirmation...');
            console.log('📤 [sendPayment] TX hash:', txHash);

            // Wait for confirmation
            const receipt = await waitForTransactionReceipt(config, {
                hash: txHash,
                chainId: CELO_MAINNET_CHAIN_ID,
            });

            if (receipt.status === 'success') {
                console.log('✅ [sendPayment] Confirmed!');

                // Submit to Divvi
                try {
                    await submitReferral({
                        txHash: txHash,
                        chainId: CELO_MAINNET_CHAIN_ID,
                    });
                    console.log('✅ [sendPayment] Divvi submitted');
                } catch (divviError) {
                    console.warn('⚠️ [sendPayment] Divvi failed:', divviError);
                }

                // Refresh balance
                await this.fetchBalance(account.address);
                
                this.showToast('Success', `Payment of ${amountInCelo} CELO completed!`);
                return true;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error: any) {
            console.error('💥 [sendPayment] Error:', error);
            
            if (error.message?.includes('rejected') || error.message?.includes('denied')) {
                throw new Error('Transaction rejected');
            }
            
            if (error.message?.includes('Insufficient')) {
                throw error;
            }
            
            throw new Error(error.message || 'Payment failed');
        }
    }

    private async initialize() {
        try {
            console.log('🚀 [initialize] Starting...');
            
            const wasDisconnected = localStorage.getItem('wallet_disconnect_requested');
            if (wasDisconnected === 'true') {
                console.log('⚠️ [initialize] Previously disconnected');
                return;
            }

            console.log('🔄 [initialize] Reconnecting...');
            await reconnect(config);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const account = getAccount(config);
            console.log('👤 [initialize] Account:', account.address);
            
            if (account.address && account.isConnected) {
                console.log('🔗 [initialize] Auto-connected:', account.address);
                
                this.updateState({ account: account.address });
                this.callbacks.onWalletChange?.(account.address);
                
                // Watch for changes
                this.unwatchAccount = watchAccount(config, {
                    onChange: (account) => {
                        console.log('👀 [watchAccount] Changed:', account.address);
                        if (account.address) {
                            this.updateState({ account: account.address });
                            this.callbacks.onWalletChange?.(account.address);
                            this.fetchBalance(account.address);
                        }
                    }
                });
                
                // Switch to CELO
                await this.checkNetwork();
                
                // Fetch balance
                setTimeout(() => {
                    if (account.address) {
                        this.fetchBalance(account.address);
                    }
                }, 1500);
            } else {
                console.log('⚠️ [initialize] No wallet connected');
            }
        } catch (error) {
            console.error('❌ [initialize] Error:', error);
        }
    }

    destroy() {
        console.log('🧹 [destroy] Cleanup');
        this.unwatchAccount?.();
    }
}