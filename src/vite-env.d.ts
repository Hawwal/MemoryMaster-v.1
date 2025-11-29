/// <reference types="vite/client" />

// Allow importing image assets
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// Environment Variable Types
interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: 'Memory Master';

  // Farcaster Mini App
  readonly VITE_FARCASTER_APP_ID?: 'S1AsBAlxF6-o';

  // Divvi Referral System
  readonly VITE_DIVVI_CONSUMER_ID?: '0xb6bb848a8e00b77698cab1626c893dc8dde4927c';

  // Supabase Keys
  readonly VITE_SUPABASE_URL?: 'https://vbelcdmahwnkzdvfnzbn.supabase.co';
  readonly VITE_SUPABASE_ANON_KEY?: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZWxjZG1haHdua3pkdmZuemJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwODk1OTAsImV4cCI6MjA3OTY2NTU5MH0.njvik7K9Jc9_UTc7udobV6ac6S2P6phWqY0iwmgwtYA;

  readonly VITE_GAME_WALLET_ADDRESS?: '0x04A34087264Fe7425dCB229b257F40E5243C75B4';
  readonly VITE_GAME_PRICE?: '0.1';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
