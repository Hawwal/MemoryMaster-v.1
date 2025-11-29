// Location: src/providers/WagmiProvider.tsx
// Create this new file for Wagmi configuration

import { WagmiProvider, createConfig, http } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import Farcaster connector
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';

// Create wagmi config with Farcaster connector
const config = createConfig({
  chains: [celo, celoAlfajores],
  connectors: [
    farcasterFrame({
      // This automatically uses Farcaster's native wallet
    }),
  ],
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
});

// Create a query client for React Query
const queryClient = new QueryClient();

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