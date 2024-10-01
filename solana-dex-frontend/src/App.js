// src/App.js
import React, { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import BN from 'bn.js'; // Ensure BN is installed
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'; // Ensure @solana/spl-token is installed

// Import your IDL file
import idl from './idl.json';

// Set up your program ID
const programID = new PublicKey('4YSCYC56LXXdMNtLvkigBXK2keE6M9zVaAjYvPCrJbW8');

// Configure the cluster
// const network = "http://localhost:8899"; // Use this for local development
const network = "https://api.devnet.solana.com"; // Use this for devnets
const opts = {
  preflightCommitment: "processed"
};

const App = () => {
  const [dexState, setDexState] = useState(null);
  const wallet = useWallet();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchDexState = async () => {
      if (wallet && wallet.publicKey) {
        const dexStateAccount = await getDexState();
        setDexState(dexStateAccount);
        setOrders(dexStateAccount.orders);
      }
    };
    fetchDexState();
  }, [wallet]);

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(
      connection, wallet, opts.preflightCommitment,
    );
    return provider;
  }

  const getDexState = async () => {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    const [dexStatePDA] = await PublicKey.findProgramAddress(
      [Buffer.from("dex_state")],
      program.programId
    );
    const account = await program.account.dexState.fetch(dexStatePDA);
    return account;
  }

  const initializeDex = async () => {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    try {
      const [dexStatePDA] = await PublicKey.findProgramAddress(
        [Buffer.from("dex_state")],
        program.programId
      );

      await program.rpc.initialize({
        accounts: {
          dexState: dexStatePDA,
          authority: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        },
      });

      console.log("DEX initialized");
      const dexStateAccount = await getDexState();
      setDexState(dexStateAccount);
    } catch (err) {
      console.error("Error initializing DEX:", err);
    }
  }

  const placeOrder = async (side, amount, price) => {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    try {
      const [dexStatePDA] = await PublicKey.findProgramAddress(
        [Buffer.from("dex_state")],
        program.programId
      );

      // Replace with actual token account addresses
      const userTokenAccount = new PublicKey('Your_User_Token_Account');
      const dexTokenAccount = new PublicKey('Your_DEX_Token_Account');

      await program.rpc.placeOrder(
        side,
        new BN(amount),
        new BN(price),
        {
          accounts: {
            dexState: dexStatePDA,
            user: provider.wallet.publicKey,
            userTokenAccount: userTokenAccount,
            dexTokenAccount: dexTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
        }
      );

      console.log("Order placed");
      const dexStateAccount = await getDexState();
      setDexState(dexStateAccount);
      setOrders(dexStateAccount.orders);
    } catch (err) {
      console.error("Error placing order:", err);
    }
  }

  const cancelOrder = async (orderId) => {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    try {
      const [dexStatePDA] = await PublicKey.findProgramAddress(
        [Buffer.from("dex_state")],
        program.programId
      );

      // Replace with actual token account addresses
      const userTokenAccount = new PublicKey('Your_User_Token_Account');
      const dexTokenAccount = new PublicKey('Your_DEX_Token_Account');

      await program.rpc.cancelOrder(
        new BN(orderId),
        {
          accounts: {
            dexState: dexStatePDA,
            user: provider.wallet.publicKey,
            userTokenAccount: userTokenAccount,
            dexTokenAccount: dexTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
        }
      );

      console.log("Order cancelled");
      const dexStateAccount = await getDexState();
      setDexState(dexStateAccount);
      setOrders(dexStateAccount.orders);
    } catch (err) {
      console.error("Error cancelling order:", err);
    }
  }

  const matchOrders = async () => {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    try {
      const [dexStatePDA] = await PublicKey.findProgramAddress(
        [Buffer.from("dex_state")],
        program.programId
      );

      await program.rpc.matchOrders({
        accounts: {
          dexState: dexStatePDA,
          authority: provider.wallet.publicKey,
        },
      });

      console.log("Orders matched");
      const dexStateAccount = await getDexState();
      setDexState(dexStateAccount);
      setOrders(dexStateAccount.orders);
    } catch (err) {
      console.error("Error matching orders:", err);
    }
  }

  // Render your component
  return (
    <div>
      <h1>Solana DEX</h1>
      <WalletMultiButton />
      {!dexState && <button onClick={initializeDex}>Initialize DEX</button>}
      {dexState && (
        <div>
          <h2>Place Order</h2>
          <button onClick={() => placeOrder('Buy', 100, 10)}>Place Buy Order</button>
          <button onClick={() => placeOrder('Sell', 100, 10)}>Place Sell Order</button>
          <h2>Orders</h2>
          <ul>
            {orders.map((order, index) => (
              <li key={index}>
                {order.side} {order.amount.toString()} @ {order.price.toString()}
                <button onClick={() => cancelOrder(order.id)}>Cancel</button>
              </li>
            ))}
          </ul>
          <button onClick={matchOrders}>Match Orders</button>
        </div>
      )}
    </div>
  );
}

export default App;
