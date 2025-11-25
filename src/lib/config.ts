export const CHAIN_IDS = {
  celoMainnet: 42220,
  celoTestnet: 11142220,
};

export const RPC_URLS = {
  [CHAIN_IDS.celoMainnet]: 'https://forno.celo.org',
  [CHAIN_IDS.celoTestnet]: 'https://forno.celo-sepolia.celo-testnet.org',
};

export const BLOCK_EXPLORERS = {
  [CHAIN_IDS.celoMainnet]: 'https://explorer.celo.org',
  [CHAIN_IDS.celoTestnet]: 'https://celo-sepolia.blockscout.com',
};

export const CELO_MAINNET_CONFIG = {
  chainId: 42220,
  name: 'Celo',
  ticker: 'CELO',
  atomicUnit: 'wei',
  decimals: 18,
  rpcUrl: 'https://forno.celo.org',
  explorerUrl: 'https://explorer.celo.org'
}

export const CELO_TESTNET_CONFIG = {
  chainId: 11142220,
  name: 'Celo Sepolia',
  ticker: 'CELO',
  atomicUnit: 'wei',
  decimals: 18,
  rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
  explorerUrl: 'https://celo-sepolia.blockscout.com'
}

export type NetworkConfig = typeof CELO_TESTNET_CONFIG

export const getNetworkConfig = (): NetworkConfig => {
  return CELO_TESTNET_CONFIG
}