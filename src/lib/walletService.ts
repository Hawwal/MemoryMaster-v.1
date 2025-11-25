import { ethers } from 'ethers';
import { getNetworkConfig} from '@/lib/config';
import { getCeloBalance } from '@/lib/tokenService';

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
        if (!window.ethereum) return;
        
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const currentConfig = getCurrentNetworkConfig();
            const isCurrentNetwork = chainId.toLowerCase() === currentConfig.chainId.toLowerCase();
            
            if (isCurrentNetwork) {
                this.updateState({ currentNetwork: currentConfig.chainName });
            } else {
                this.updateState({ currentNetwork: 'Other Network' });
            }
        } catch (error) {
            this.updateState({ currentNetwork: 'Unknown' });
        }
    }

    private showToast(title: string, description: string) {
        this.callbacks.onToast?.(title, description);
    }

    async connectWallet() {
        if (!window.ethereum) {
            this.showToast("Error", "Please install MetaMask!");
            return;
        }

        this.updateState({ isConnecting: true });
        try {
            await this.checkNetwork();
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const address = await provider.getSigner().getAddress();
            
            this.updateState({ account: address });
            this.callbacks.onWalletChange?.(address);
            await this.fetchBalance(address);

            localStorage.removeItem('wallet_disconnect_requested');
            this.showToast("Success", "Wallet connected successfully!");
            
        } catch (error: any) {
            this.showToast("Error", error.message || "Failed to connect wallet");
        } finally {
            this.updateState({ isConnecting: false });
        }
    }

    async disconnectWallet() {
        try {
            await window.ethereum.request({
                method: 'wallet_revokePermissions',
                params: [
                    {
                        eth_accounts: {},
                    },
                ],
            });
        } catch (error) {
            console.log('Failed to revoke permissions:', error);
        }
        
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
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    private async initialize() {
        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts: string[]) => {
            const addr = accounts[0] || '';
            this.updateState({ account: addr });
            this.callbacks.onWalletChange?.(addr);
            
            if (addr) {
                this.fetchBalance(addr);
            } else {
                this.updateState({ currentNetwork: '', balance: '' });
            }
        };

        const checkExistingConnection = async () => {
            try {
                const wasDisconnected = localStorage.getItem('wallet_disconnect_requested');
                if (wasDisconnected === 'true') {
                    console.log('User disconnected, not auto-connecting');
                    return;
                }

                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    this.updateState({ account: accounts[0] });
                    this.callbacks.onWalletChange?.(accounts[0]);
                    await this.checkNetwork();
                    setTimeout(() => this.fetchBalance(accounts[0]), 100);
                }
            } catch (error) {
                console.log('Failed to check existing connection:', error);
            }
        };

        await checkExistingConnection();

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => this.checkNetwork());
    }

    destroy() {
        if (window.ethereum) {
            window.ethereum.removeAllListeners('accountsChanged');
            window.ethereum.removeAllListeners('chainChanged');
        }
    }
}