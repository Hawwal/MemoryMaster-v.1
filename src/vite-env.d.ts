// Location: src/vite-env.d.ts
// TypeScript declarations for Vite environment variables and global types

/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase Configuration
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  
  // Farcaster Configuration
  readonly VITE_FARCASTER_APP_ID: string
  
  // Game Configuration
  readonly VITE_GAME_WALLET_ADDRESS: string
  readonly VITE_GAME_PRICE: string
  readonly VITE_CELO_NETWORK: string
  
  // Divvi Referral Tracking
  readonly VITE_DIVVI_CONSUMER_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Window ethereum object (optional - only needed if you have fallback support)
// Since we're using Farcaster wallet exclusively via wagmi, this is optional
// Uncomment if you still need ethereum object for other purposes:
// interface Window {
//   ethereum?: any
// 