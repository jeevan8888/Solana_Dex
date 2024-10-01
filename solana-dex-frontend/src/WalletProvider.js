// src/WalletProvider.js
import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    PhantomWalletAdapter,
    // Add other wallet adapters here if needed
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

// Import the wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const WalletProvider = ({ children }) => {
    // Can be set to 'mainnet-beta', 'testnet', or 'devnet'
    const network = WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint
    const endpoint = useMemo(() => 'https://api.devnet.solana.com', []);

    // Configure the wallets you want to support
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            // Add other wallets here
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <SolanaWalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </SolanaWalletProvider>
        </ConnectionProvider>
    );
};

export default WalletProvider;
