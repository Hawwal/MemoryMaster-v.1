import { ethers } from 'ethers';
import { getNetworkConfig} from '@/lib/config';
import { getCeloBalance } from '@/lib/tokenService';
import { wagmiConfig } from '@/lib/wagmiClient';
import { getConnectorClient } from 'wagmi/actions';
import { celo } from 'wagmi/chains';
import { parseEther } from 'viem';
import { getReferralTag } from '@divvi/referral-sdk/referral';
import { submitReferral } from '@divvi/referral-sdk/api';

// Divvi Consumer Address
const DIVVI_CONSUMER_ADDRESS = '0xB6Bb848A8E00b77698CAb1626C893dc8ddE4927c';

const getCurrentNetworkConfig = () => {
    const config = getNetworkConfig();
    return {
        chainId: `0x${config.chainId.toString(16)}`,
        chainName: config.name,
        ticker: config.ticker,
    };
};

export interface WalletState {
    account: string;
    currentNetwork: string;
    isConnecting: boolean;
    balance: string;
    isLoadingBalance: boolean;
    farcasterFid?: string;
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
        isLoadingBalance: false,
        farcasterFid: undefined
    };
    private callbacks: WalletCallbacks = {};
    private stateUpdateCallback?: (state: WalletState) => void;
    private wagmiClient?: any;

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
            const currentConfig = getCurrentNetworkConfig();
            const balance = await getCeloBalance(address, parseInt(currentConfig.chainId, 16));

            this.updateState({ 
                balance: parseFloat(balance).toFixed(4),
                isLoadingBalance: false
            });
        } catch (error) {
            this.updateState({ balance: '0.0000', isLoadingBalance: false });
        }
    }

    async checkNetwork() {
        try {
            if (this.wagmiClient) {
                const chainId = await this.wagmiClient.getChainId();
                const currentConfig = getCurrentNetworkConfig();
                const isCurrentNetwork = chainId === parseInt(currentConfig.chainId, 16);
                
                if (isCurrentNetwork) {
                    this.updateState({ currentNetwork: currentConfig.chainName });
                } else {
                    this.updateState({ currentNetwork: 'Other Network' });
                }
            }
        } catch (error) {
            this.updateState({ currentNetwork: 'Unknown' });
        }
    }

    private showToast(title: string, description: string) {
        this.callbacks.onToast?.(title, description);
    }

    async connectWallet() {
        // Check if we're in a Farcaster frame environment
        if (typeof window === 'undefined' || !window.parent) {
            this.showToast("Error", "Please open this app in Farcaster!");
            return;
        }

        this.updateState({ isConnecting: true });
        try {
            // Get Farcaster connector client
            this.wagmiClient = await getConnectorClient(wagmiConfig, {
                chainId: celo.id
            });

            if (!this.wagmiClient) {
                throw new Error("Failed to connect to Farcaster wallet");
            }

            const address = this.wagmiClient.account.address;
            
            // Get Farcaster FID if available
            const fid = await this.getFarcasterFid();
            
            this.updateState({ 
                account: address,
                farcasterFid: fid 
            });
            
            this.callbacks.onWalletChange?.(address);
            await this.checkNetwork();
            await this.fetchBalance(address);

            // Initialize Divvi referral tracking
            await this.initializeDivviReferral(address, fid);

            localStorage.removeItem('wallet_disconnect_requested');
            this.showToast("Success", "Farcaster wallet connected successfully!");
            
        } catch (error: any) {
            console.error('Farcaster wallet connection error:', error);
            this.showToast("Error", error.message || "Failed to connect Farcaster wallet");
        } finally {
            this.updateState({ isConnecting: false });
        }
    }

    async disconnectWallet() {
        try {
            // Clear wagmi client
            this.wagmiClient = null;
            
            localStorage.setItem('wallet_disconnect_requested', 'true');
            this.updateState({
                account: '',
                currentNetwork: '',
                balance: '',
                farcasterFid: undefined
            });
            this.callbacks.onWalletChange?.('');
            
            this.showToast("Success", "Farcaster wallet disconnected successfully!");
        } catch (error) {
            console.error('Failed to disconnect:', error);
            this.showToast("Error", "Failed to disconnect wallet");
        }
    }

    private async getFarcasterFid(): Promise<string | undefined> {
        try {
            // Attempt to get Farcaster FID from frame context
            if (window.parent && window.parent !== window) {
                // Post message to parent frame to get FID
                return new Promise((resolve) => {
                    const messageHandler = (event: MessageEvent) => {
                        if (event.data?.type === 'farcaster_fid') {
                            window.removeEventListener('message', messageHandler);
                            resolve(event.data.fid);
                        }
                    };
                    
                    window.addEventListener('message', messageHandler);
                    window.parent.postMessage({ type: 'get_farcaster_fid' }, '*');
                    
                    // Timeout after 3 seconds
                    setTimeout(() => {
                        window.removeEventListener('message', messageHandler);
                        resolve(undefined);
                    }, 3000);
                });
            }
        } catch (error) {
            console.error('Failed to get Farcaster FID:', error);
        }
        return undefined;
    }

    private async initializeDivviReferral(address: string, fid?: string) {
        try {
            // Get referral tag if user came from a referral
            const referralTag = getReferralTag();
            
            if (referralTag && fid) {
                // Submit referral to Divvi
                await submitReferral({
                    consumerAddress: DIVVI_CONSUMER_ADDRESS,
                    referrerAddress: referralTag,
                    referredAddress: address,
                    metadata: {
                        farcasterFid: fid,
                        timestamp: Date.now(),
                        dappName: 'Memory Master'
                    }
                });
                
                console.log('Divvi referral submitted successfully');
                this.showToast("Referral", "Welcome! Your referral has been recorded.");
            }
        } catch (error) {
            console.error('Failed to initialize Divvi referral:', error);
            // Don't show error to user as referral is optional
        }
    }

    async makePayment(amount: string, recipient?: string): Promise<boolean> {
        try {
            if (!this.wagmiClient) {
                throw new Error("Wallet not connected");
            }

            const tx = await this.wagmiClient.sendTransaction({
                to: recipient || DIVVI_CONSUMER_ADDRESS,
                value: parseEther(amount),
                chain: celo
            });

            await tx.wait();
            
            // Update balance after payment
            await this.fetchBalance(this.state.account);
            
            this.showToast("Success", `Payment of ${amount} CELO completed!`);
            return true;
        } catch (error: any) {
            console.error('Payment failed:', error);
            this.showToast("Error", error.message || "Payment failed");
            return false;
        }
    }

    formatAddress(address: string): string {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    getFarcasterFid(): string | undefined {
        return this.state.farcasterFid;
    }

    getDivviConsumerAddress(): string {
        return DIVVI_CONSUMER_ADDRESS;
    }

    private async initialize() {
        try {
            const wasDisconnected = localStorage.getItem('wallet_disconnect_requested');
            if (wasDisconnected === 'true') {
                console.log('User disconnected, not auto-connecting');
                return;
            }

            // Check if already connected to Farcaster wallet
            const existingClient = await getConnectorClient(wagmiConfig, {
                chainId: celo.id
            }).catch(() => null);

            if (existingClient?.account?.address) {
                this.wagmiClient = existingClient;
                const address = existingClient.account.address;
                const fid = await this.getFarcasterFid();
                
                this.updateState({ 
                    account: address,
                    farcasterFid: fid 
                });
                
                this.callbacks.onWalletChange?.(address);
                await this.checkNetwork();
                setTimeout(() => this.fetchBalance(address), 100);
                
                // Initialize Divvi referral for existing connection
                await this.initializeDivviReferral(address, fid);
            }
        } catch (error) {
            console.log('Failed to check existing Farcaster connection:', error);
        }
    }

    destroy() {
        // Clean up any resources
        this.wagmiClient = null;
    }
}
