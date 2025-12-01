// Location: src/providers/WagmiProvider.tsx
// FIXED: Proper connector setup for CELO-only configuration

import { WagmiProvider, createConfig, http } from 'wagmi';
import { celo } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';

// CRITICAL: Only configure CELO mainnet
// This forces ALL wallet operations to use CELO chain
const config = createConfig({
  chains: [celo], // ONLY CELO - no other chains
  transports: {
    [celo.id]: http('https://forno.celo.org'), // Official CELO RPC
  },
  connectors: [
    farcasterFrame({
      // Farcaster Frame connector will use CELO as the only chain
    }),
  ],
  multiInjectedProviderDiscovery: false,
});

// Log configuration
console.log('🔧 Wagmi Config:', {
  chains: config.chains.map(c => ({ id: c.id, name: c.name })),
  defaultChain: celo.name
});

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
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