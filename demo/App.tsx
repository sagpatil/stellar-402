/**
 * Demo App - Stellar Paywall
 */

import React, { useState } from 'react';
import { StellarPaywall } from './components/StellarPaywall';
import type { PaymentRequirement } from './components/StellarPaywall';
import './styles/paywall.css';

function App() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Demo payment requirement - TESTNET ONLY
  // For demo: paying to yourself (self-payment) to avoid trustline issues
  // In production, this would be the facilitator/merchant address
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  
  const requirement: PaymentRequirement = {
    network: 'testnet', // ✅ Using Stellar Testnet
    recipient: recipientAddress || 'GBVVRXLMNCJQW4HXCYDID4CQQC2SNDMOXGO4QQVZQCVGT6ELJKYUOIRU', // Fallback address
    amount: '0.01',
    memo: 'x402-demo-payment',
    description: 'Access premium weather data API',
  };

  const handlePaymentSuccess = (hash: string) => {
    console.log('Payment successful:', hash);
    setTxHash(hash);
    setPaymentComplete(true);
  };

  const handlePaymentError = (error: Error) => {
    console.error('Payment failed:', error);
  };

  const handleReset = () => {
    setShowPaywall(false);
    setPaymentComplete(false);
    setTxHash(null);
  };

  const handleUnlockClick = () => {
    setShowPaywall(true);
  };

  if (paymentComplete) {
    return (
      <div className="app-container">
        <div className="protected-content">
          <div className="success-badge">
            ✓ Payment Verified
          </div>
          
          <h1>🎉 Welcome to Premium Content!</h1>
          
          <p style={{ color: '#6c757d', marginBottom: '2rem' }}>
            Your payment has been confirmed on the Stellar network.
          </p>

          {txHash && (
            <div style={{ 
              background: '#f8f9fa',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '2rem',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#6c757d',
                marginBottom: '0.5rem',
                fontWeight: 'bold'
              }}>
                Transaction Hash:
              </div>
              <div style={{ 
                fontFamily: 'Monaco, monospace', 
                fontSize: '0.85rem', 
                color: '#495057',
                wordBreak: 'break-all',
                marginBottom: '0.75rem'
              }}>
                {txHash}
              </div>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                🔍 View on Stellar.Expert
              </a>
            </div>
          )}

          <div className="content-box">
            <h2>Premium Weather Data</h2>
            <p>
              <strong>Temperature:</strong> 72°F (22°C)<br />
              <strong>Conditions:</strong> Partly Cloudy<br />
              <strong>Humidity:</strong> 65%<br />
              <strong>Wind:</strong> 10 mph NW<br />
              <strong>UV Index:</strong> 6 (High)<br />
              <strong>Visibility:</strong> 10 miles<br />
            </p>
          </div>

          <div className="content-box">
            <h2>7-Day Forecast</h2>
            <p>
              Mon: ☀️ 75°F | Tue: ⛅ 73°F | Wed: 🌧️ 68°F<br />
              Thu: ⛅ 70°F | Fri: ☀️ 74°F | Sat: ☀️ 76°F | Sun: ⛅ 72°F
            </p>
          </div>

          <div className="content-box">
            <h2>Hourly Breakdown</h2>
            <p>
              This premium data includes detailed hourly forecasts,
              precipitation probability, air quality index, pollen count,
              and severe weather alerts for your location.
            </p>
          </div>

          <button onClick={handleReset} className="btn btn-secondary" style={{ marginTop: '2rem' }}>
            Try Another Payment
          </button>

          <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#6c757d' }}>
            <p>
              <strong>How x402 Works:</strong><br />
              1. You requested protected content<br />
              2. Server returned 402 Payment Required<br />
              3. You paid with Stellar USDC<br />
              4. Transaction confirmed on-chain<br />
              5. Content unlocked automatically
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Landing page - before paywall
  if (!showPaywall) {
    return (
      <div className="app-container">
        <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'white' }}>
          <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>
            StellarX402 Demo
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: 0 }}>
            Stellar x402 Payment Protocol
          </p>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '3rem',
          maxWidth: '600px',
          margin: '0 auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
              🔒
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>
              Premium Content Locked
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
              Access exclusive premium weather data API with detailed forecasts, 
              hourly breakdowns, and real-time alerts.
            </p>

            <div style={{
              background: '#f8f9fa',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '2rem',
              textAlign: 'left',
            }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>
                What's Included:
              </h3>
              <ul style={{ color: '#666', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
                <li>🌡️ Real-time temperature and conditions</li>
                <li>📅 7-day detailed forecast</li>
                <li>⏰ Hourly weather breakdown</li>
                <li>💨 Wind speed and air quality data</li>
                <li>⚠️ Severe weather alerts</li>
                <li>🌸 Pollen count and UV index</li>
              </ul>
            </div>

            <div style={{
              background: '#e7f3ff',
              border: '2px solid #0066cc',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '2rem',
            }}>
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                One-time payment
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0066cc' }}>
                0.01 USDC
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                on Stellar Testnet
              </div>
            </div>

            <button
              onClick={handleUnlockClick}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '1rem 3rem',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              🚀 Pay Now to Unlock
            </button>

            <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '1.5rem' }}>
              Powered by Stellar blockchain • Instant access • Secure payments
            </p>
            
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '0.75rem', 
              background: '#fff3cd', 
              border: '1px solid #ffc107',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: '#856404',
              textAlign: 'left'
            }}>
              <strong>💡 Demo Note:</strong> For testing, you'll pay to your own wallet address 
              (self-payment). In production, this would go to the merchant/facilitator.
            </div>
          </div>
        </div>

        <div style={{ 
          textAlign: 'center', 
          marginTop: '2rem', 
          color: 'white',
          opacity: 0.8,
          fontSize: '0.9rem'
        }}>
          <p>
            ⚠️ <strong>TESTNET ONLY</strong> - This demo uses Stellar Testnet
          </p>
          <p>
            Get test USDC from the{' '}
            <a 
              href="https://laboratory.stellar.org/#account-creator?network=test"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'white', textDecoration: 'underline' }}
            >
              Stellar Laboratory
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Paywall page
  return (
    <div className="app-container">
      <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'white' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>
          StellarX402 Demo
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: 0 }}>
          Stellar x402 Payment Protocol
        </p>
      </div>

      <StellarPaywall
        requirement={requirement}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />

      <div style={{ 
        textAlign: 'center', 
        marginTop: '2rem', 
        color: 'white',
        opacity: 0.8,
        fontSize: '0.9rem'
      }}>
        <p>
          ⚠️ <strong>TESTNET ONLY</strong> - This demo uses Stellar Testnet
        </p>
        <p>
          Get test USDC from the{' '}
          <a 
            href="https://laboratory.stellar.org/#account-creator?network=test"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'white', textDecoration: 'underline' }}
          >
            Stellar Laboratory
          </a>
        </p>
        <p style={{ marginTop: '1rem' }}>
          <strong>Supported Wallets:</strong> Freighter, Albedo, xBull, Rabet, and more!
        </p>
      </div>
    </div>
  );
}

export default App;

