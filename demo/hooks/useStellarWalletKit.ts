/**
 * Stellar Wallets Kit hook
 * Supports multiple wallets: Freighter, Albedo, xBull, Rabet, etc.
 */

import { useState, useEffect, useCallback } from 'react';
import { StellarWalletsKit, WalletNetwork, ISupportedWallet, allowAllModules } from '@creit.tech/stellar-wallets-kit';
import { Networks } from '@stellar/stellar-sdk';

export interface WalletState {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  error: string | null;
  initialized: boolean;
}

let kit: StellarWalletsKit | null = null;

export function useStellarWalletKit() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    connecting: false,
    address: null,
    error: null,
    initialized: false,
  });

  // Initialize the kit
  useEffect(() => {
    if (typeof window === 'undefined' || kit !== null) {
      if (kit !== null) {
        setState(prev => ({ ...prev, initialized: true }));
      }
      return;
    }

    try {
      // Create a new instance of StellarWalletsKit
      kit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        selectedWalletId: undefined,
        modules: allowAllModules(),
      });
      
      setState(prev => ({ ...prev, initialized: true }));
      console.log('Stellar Wallets Kit initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stellar Wallets Kit:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to initialize wallet kit: ${error}`,
        initialized: false,
      }));
    }
  }, []);

  const connect = useCallback(async () => {
    if (!kit) {
      setState(prev => ({ ...prev, error: 'Wallet kit not initialized' }));
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));
    
    try {
      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          try {
            kit!.setWallet(option.id);
            const { address } = await kit!.getAddress();
            
            setState({
              connected: true,
              connecting: false,
              address: address,
              error: null,
              initialized: true,
            });
          } catch (err: any) {
            console.error('Wallet connection error:', err);
            setState(prev => ({
              ...prev,
              connected: false,
              connecting: false,
              error: err.message || 'Failed to connect wallet',
            }));
          }
        },
        onClosed: () => {
          setState(prev => ({
            ...prev,
            connecting: false,
          }));
        },
      });
    } catch (error: any) {
      console.error('Failed to open wallet modal:', error);
      setState(prev => ({
        ...prev,
        connecting: false,
        error: error.message || 'Failed to open wallet selection',
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!kit) return;

    try {
      setState({
        connected: false,
        connecting: false,
        address: null,
        error: null,
        initialized: true,
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to disconnect wallet',
      }));
    }
  }, []);

  const signTransaction = useCallback(async (xdr: string) => {
    if (!state.connected || !state.address || !kit) {
      throw new Error('Wallet not connected');
    }

    try {
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        networkPassphrase: Networks.TESTNET,
        address: state.address,
      });
      return signedTxXdr;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign transaction';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [state.connected, state.address]);

  return {
    ...state,
    connect,
    disconnect,
    signTransaction,
  };
}

