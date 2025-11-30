// Location: src/providers/WagmiProvider.tsx
// Fixed version to properly read CELO balance from Farcaster wallet

import { WagmiProvider, createConfig, http } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';

// Determine which network to use based on environment
const isMainnet = import.meta.env.VITE_CELO_NETWORK === 'mainnet';

// Create wagmi config with Farcaster connector
const config = createConfig({
  chains: isMainnet ? [celo] : [celoAlfajores, celo],
  connectors: [
    farcasterFrame({
      // Farcaster Frame connector auto-detects the user's wallet
    }),
  ],
  transports: {
    [celo.id]: http('https://forno.celo.org'), // CELO mainnet RPC
    [celoAlfajores.id]: http('https://alfajores-forno.celo-testnet.org'), // Testnet RPC
  },
});

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface WagmiProviderWrapperProps {
  children: ReactNode;
}

export function WagmiProviderWrapper({ children }: WagmiProviderWrapperProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export { config };