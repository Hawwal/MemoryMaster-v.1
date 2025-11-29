import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { WagmiProviderWrapper } from './providers/WagmiProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProviderWrapper>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WagmiProviderWrapper>
  </React.StrictMode>
);