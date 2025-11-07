/**
 * Wallet Connection Button using Stellar Wallets Kit
 */

import React, { useEffect, useRef } from 'react';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';

interface WalletButtonProps {
  onStatusChange?: (message: string, tone?: 'info' | 'success' | 'error') => void;
}

export function WalletButton({ onStatusChange }: WalletButtonProps) {
  const buttonWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buttonWrapperRef.current) return;

    const createButton = async () => {
      try {
        await StellarWalletsKit.createButton(buttonWrapperRef.current!, {
          onClick: () => {
            onStatusChange?.('Opening wallet options...', 'info');
          },
        });
      } catch (error) {
        console.error('Failed to create wallet button:', error);
        onStatusChange?.('Failed to create wallet button', 'error');
      }
    };

    createButton();
  }, [onStatusChange]);

  return <div ref={buttonWrapperRef} className="wallet-button-container" />;
}

