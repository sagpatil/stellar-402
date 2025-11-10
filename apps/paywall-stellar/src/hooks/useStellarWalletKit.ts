import { useCallback, useEffect, useState } from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  type ISupportedWallet,
  allowAllModules
} from '@creit.tech/stellar-wallets-kit';
import { Networks } from '@stellar/stellar-sdk';

import type { StellarNetwork } from '@stellar-x402/client-stellar';

interface UseStellarWalletKitOptions {
  network?: StellarNetwork;
}

export interface WalletState {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  error: string | null;
  initialized: boolean;
}

let walletKit: StellarWalletsKit | null = null;

export function useStellarWalletKit(options?: UseStellarWalletKitOptions) {
  const network: StellarNetwork = options?.network ?? 'testnet';

  const [state, setState] = useState<WalletState>({
    connected: false,
    connecting: false,
    address: null,
    error: null,
    initialized: false
  });

  const walletNetwork = network === 'testnet' ? WalletNetwork.TESTNET : WalletNetwork.PUBLIC;

  const networkPassphrase = network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (walletKit) {
      setState((prev) => ({ ...prev, initialized: true }));
      return;
    }

    try {
      const modules = allowAllModules();
      const selectedWalletId = modules[0]?.id ?? 'freighter';

      walletKit = new StellarWalletsKit({
        network: walletNetwork,
        modules,
        selectedWalletId
      });

      setState((prev) => ({ ...prev, initialized: true }));
      console.log('Stellar Wallets Kit initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stellar Wallets Kit:', error);
      setState((prev) => ({
        ...prev,
        error: `Failed to initialize wallet kit: ${error}`,
        initialized: false
      }));
    }
  }, [walletNetwork]);

  const connect = useCallback(async () => {
    if (!walletKit) {
      setState(prev => ({ ...prev, error: 'Wallet kit not initialized' }));
      return;
    }

    setState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      await walletKit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          try {
            walletKit!.setWallet(option.id);
            const { address } = await walletKit!.getAddress();
            setState({
              connected: true,
              connecting: false,
              address,
              error: null,
              initialized: true
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to connect wallet';
            setState((prev) => ({
              ...prev,
              connected: false,
              connecting: false,
              error: message
            }));
          }
        },
        onClosed: () => {
          setState((prev) => ({ ...prev, connecting: false }));
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open wallet modal';
      console.error('Wallet kit open modal failed:', error);
      setState((prev) => ({
        ...prev,
        connecting: false,
        error: message
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      connecting: false,
      address: null,
      error: null,
      initialized: true
    });
  }, []);

  const signTransaction = useCallback(
    async (xdr: string) => {
      if (!state.connected || !state.address || !walletKit) {
        throw new Error('Wallet not connected');
      }

      try {
        const { signedTxXdr } = await walletKit.signTransaction(xdr, {
          networkPassphrase,
          address: state.address
        });
        return signedTxXdr;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sign transaction';
        setState((prev) => ({ ...prev, error: message }));
        throw error;
      }
    },
    [networkPassphrase, state.address, state.connected]
  );

  return {
    ...state,
    connect,
    disconnect,
    signTransaction
  };
}

