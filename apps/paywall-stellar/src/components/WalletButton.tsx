import { useEffect, useRef } from 'react';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';

interface WalletButtonProps {
  onStatusChange?: (message: string, tone?: 'info' | 'success' | 'error') => void;
}

export function WalletButton({ onStatusChange }: WalletButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let disposed = false;

    const renderButton = async () => {
      try {
        const element = containerRef.current;
        if (!element) {
          return;
        }

        await StellarWalletsKit.createButton(element, {
          onClick: () => onStatusChange?.('Opening wallet options...', 'info')
        });
      } catch (error) {
        if (!disposed) {
          console.error('Failed to render wallet button', error);
          onStatusChange?.('Failed to render wallet button', 'error');
        }
      }
    };

    renderButton();

    return () => {
      disposed = true;
    };
  }, [onStatusChange]);

  return <div ref={containerRef} className="wallet-button-container" />;
}

