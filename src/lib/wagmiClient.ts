import { createConfig, http } from 'wagmi';
import { celo } from 'wagmi/chains';
import { farcasterFrame } from '@wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [celo],
  connectors: [
    farcasterFrame({
      // Add any specific Farcaster frame configuration here
    })
  ],
  transports: {
    [celo.id]: http('https://forno.celo.org'),
  },
});
