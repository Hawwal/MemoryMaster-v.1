// Location: src/providers/WagmiProvider.tsx
// Fixed version to ensure CELO mainnet is the primary chain

import { WagmiProvider, createConfig, http } from 'wagmi';
import { celo } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';

// Always use CELO mainnet as primary chain
// IMPORTANT: Only include CELO mainnet in chains array
const config = createConfig({
  chains: [celo], // Only CELO mainnet - this ensures all operations default to CELO
  connectors: [
    farcasterFrame({
      // Farcaster Frame connector auto-detects the user's wallet
    }),
  ],
  transports: {
    [celo.id]: http('https://forno.celo.org'), // CELO mainnet RPC
  },
  // Set CELO mainnet as the initial chain
  multiInjectedProviderDiscovery: false,
});

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000, // Cache for 5 seconds
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