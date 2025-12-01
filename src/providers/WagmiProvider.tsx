// Location: src/providers/WagmiProvider.tsx
// FIXED: Using correct Farcaster Mini App connector

'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// CRITICAL FIX: Use farcasterMiniApp (not farcasterFrame)
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

// Create wagmi config with CORRECT Farcaster connector
const config = createConfig({
  chains: [celo, celoAlfajores],
  connectors: [
    farcasterMiniApp(), // FIXED: This is the correct connector for Mini Apps
  ],
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
});

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
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

// Export config for use in walletService
export { config };