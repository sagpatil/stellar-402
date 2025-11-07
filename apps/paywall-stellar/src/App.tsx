import { useCallback, useMemo, useState } from 'react';

import type { StellarPaymentRequirement } from '@stellar-x402/client-stellar';

import { StellarPaywall } from './components/StellarPaywall.js';

const RESOURCE_URL = import.meta.env.VITE_RESOURCE_URL ?? 'http://localhost:4022/weather/premium';
const PAYMENT_HEADER_NAME = 'X-PAYMENT';

type ViewState = 'landing' | 'paywall' | 'unlocked';

interface PaymentRequiredResponse {
  error: 'PAYMENT_REQUIRED';
  paymentRequirements: StellarPaymentRequirement;
  invalidReason?: string;
}

interface FacilitatorSettleResponse {
  success: boolean;
  txHash?: string;
  networkId?: string;
  ledger?: number;
  [key: string]: unknown;
}

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requirement, setRequirement] = useState<StellarPaymentRequirement | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);
  const [resourceData, setResourceData] = useState<Record<string, unknown> | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [paymentHeader, setPaymentHeader] = useState<string | null>(null);
  const [showCurl, setShowCurl] = useState(false);
  const [replayPreview, setReplayPreview] = useState<string | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);

  const fetchResource = useCallback(async (header?: string) => {
    setLoading(true);

    const headers: Record<string, string> = {
      accept: 'application/json'
    };
    if (header) {
      headers[PAYMENT_HEADER_NAME] = header;
    }

    try {
      const response = await fetch(RESOURCE_URL, {
        method: 'GET',
        headers
      });

      if (response.status === 402) {
        const body = (await response.json()) as PaymentRequiredResponse;
        setRequirement(body.paymentRequirements);
        setInvalidReason(body.invalidReason ?? null);
        setResourceData(null);
        setError(null);
        setView('paywall');
        return { success: false, requiresPayment: true } as const;
      }

      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>;
        const paymentResponseRaw = response.headers.get('X-PAYMENT-RESPONSE');
        const settleInfo = decodePaymentResponse(paymentResponseRaw);

        setResourceData(data);
        setRequirement(null);
        setInvalidReason(null);
        setError(null);
        setTxHash(settleInfo?.txHash ?? null);
        setPaymentHeader(header ?? null);
        setView('unlocked');
        return { success: true, settle: settleInfo } as const;
      }

      const text = await response.text();
      throw new Error(text || response.statusText || `Request failed (${response.status})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reach resource server';
      setError(message);
      return { success: false, error: message } as const;
    } finally {
      setLoading(false);
    }
  }, []);

  const startAccess = useCallback(() => {
    setTxHash(null);
    setPaymentHeader(null);
    void fetchResource();
  }, [fetchResource]);

  const handlePaymentPrepared = useCallback(
    async (header: string) => {
      const result = await fetchResource(header);
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to unlock resource');
      }
    },
    [fetchResource]
  );

  const toggleCurl = useCallback(() => {
    setShowCurl((previous) => !previous);
  }, []);

  const buildCurlCommand = useCallback(
    (headerValue: string) => `curl -H "${PAYMENT_HEADER_NAME}: ${headerValue}" ${RESOURCE_URL}`,
    []
  );

  const replayRequest = useCallback(async () => {
    if (!paymentHeader) {
      return;
    }

    setReplayLoading(true);
    setReplayError(null);
    try {
      const response = await fetch(RESOURCE_URL, {
        headers: {
          accept: 'application/json',
          [PAYMENT_HEADER_NAME]: paymentHeader
        }
      });

      const text = await response.text();
      let preview: string;
      try {
        preview = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        preview = text;
      }

      setReplayPreview(preview);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Replay request failed';
      setReplayError(message);
      setReplayPreview(null);
    } finally {
      setReplayLoading(false);
    }
  }, [paymentHeader]);

  const reset = useCallback(() => {
    setView('landing');
    setRequirement(null);
    setInvalidReason(null);
    setResourceData(null);
    setTxHash(null);
    setPaymentHeader(null);
    setError(null);
    setShowCurl(false);
    setReplayPreview(null);
    setReplayError(null);
    setReplayLoading(false);
  }, []);

  const resourceDisplay = useMemo(() => {
    if (!resourceData) {
      return null;
    }
    try {
      return JSON.stringify(resourceData, null, 2);
    } catch (error) {
      console.error('Failed to serialize resource response', error);
      return String(resourceData);
    }
  }, [resourceData]);

  if (view === 'unlocked' && resourceDisplay) {
    return (
      <div className="app-container">
        <div className="protected-content">
          <div className="success-badge">✓ Payment Verified</div>
          <h1>Premium Content Unlocked</h1>
          <p style={{ color: '#6c757d', marginBottom: '2rem' }}>Payment settled via the Stellar facilitator.</p>

          {txHash ? (
            <div
              style={{
                background: '#f8f9fa',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '2rem',
                border: '1px solid #dee2e6'
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#6c757d', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Transaction Hash
              </div>
              <div
                style={{
                  fontFamily: 'Monaco, monospace',
                  fontSize: '0.85rem',
                  color: '#495057',
                  wordBreak: 'break-all',
                  marginBottom: '0.75rem'
                }}
              >
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
                  fontSize: '0.9rem'
                }}
              >
                View on Stellar Expert
              </a>
            </div>
          ) : null}

          {paymentHeader ? (
            <div
              style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '2rem',
                border: '1px solid #dee2e6'
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#6c757d', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                X-PAYMENT Header (replay token)
              </div>
              <textarea
                value={paymentHeader}
                readOnly
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'Monaco, monospace',
                  fontSize: '0.85rem',
                  color: '#495057',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #ced4da',
                  marginBottom: '0.75rem'
                }}
                onFocus={(event) => event.currentTarget.select()}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigator.clipboard?.writeText(paymentHeader).catch(() => {/* ignore */})}
                >
                  Copy Header
                </button>
                <button type="button" className="btn btn-secondary" onClick={toggleCurl}>
                  {showCurl ? 'Hide curl' : 'Show curl command'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={replayRequest}
                  disabled={replayLoading}
                >
                  {replayLoading ? 'Replaying…' : 'Replay request'}
                </button>
              </div>
              {showCurl ? (
                <pre
                  style={{
                    marginTop: '0.75rem',
                    background: '#1f2937',
                    color: '#e5e7eb',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    overflowX: 'auto'
                  }}
                >
                  {buildCurlCommand(paymentHeader)}
                </pre>
              ) : null}
              {replayError ? (
                <div className="error-message" style={{ marginTop: '0.75rem' }}>
                  <p>{replayError}</p>
                </div>
              ) : null}
              {replayPreview ? (
                <div
                  style={{
                    marginTop: '0.75rem',
                    background: '#f8f9fa',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    border: '1px solid #dee2e6'
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#495057' }}>Replay Response</div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{replayPreview}</pre>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="content-box">
            <h2>Premium Weather Data</h2>
            <pre
              style={{
                textAlign: 'left',
                background: '#1f2937',
                color: '#e5e7eb',
                padding: '1.5rem',
                borderRadius: '8px',
                overflowX: 'auto'
              }}
            >
              {resourceDisplay}
            </pre>
          </div>

          <button className="btn btn-secondary" onClick={reset} style={{ marginTop: '2rem' }}>
            Try Another Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'white' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>Stellar x402 Demo</h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: 0 }}>Pay to unlock premium content instantly.</p>
      </div>

      {view === 'landing' ? (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '3rem',
            maxWidth: '600px',
            margin: '0 auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>Premium content locked</h2>
            <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1.5rem' }}>
              Request the resource to see real payment requirements from the facilitator-backed server.
            </p>

            {error ? (
              <div style={{ marginBottom: '1rem', color: '#c92a2a' }}>{error}</div>
            ) : null}

            <button
              onClick={startAccess}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '1rem 3rem',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Contacting resource…' : 'Request Premium Resource'}
            </button>
          </div>
        </div>
      ) : null}

      {view === 'paywall' && requirement ? (
        <div>
          {invalidReason ? (
            <div className="error-message" style={{ marginBottom: '1rem' }}>
              <strong>Resource server request failed:</strong> {invalidReason}
            </div>
          ) : null}
          {error ? (
            <div className="error-message" style={{ marginBottom: '1rem' }}>
              <strong>Client error:</strong> {error}
            </div>
          ) : null}
          <StellarPaywall
            requirement={requirement}
            onPaymentPrepared={handlePaymentPrepared}
            onError={(error) => setError(error.message)}
          />
          <button className="btn btn-secondary" style={{ marginTop: '1.5rem' }} onClick={reset}>
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}

function decodePaymentResponse(headerValue: string | null): FacilitatorSettleResponse | null {
  if (!headerValue) {
    return null;
  }

  try {
    const decoded = decodeBase64(headerValue);
    const parsed = JSON.parse(decoded) as FacilitatorSettleResponse;
    return parsed;
  } catch (error) {
    console.warn('Failed to decode X-PAYMENT-RESPONSE header', error);
    return null;
  }
}

function decodeBase64(value: string): string {
  if (typeof atob === 'function') {
    return atob(value);
  }

  throw new Error('Base64 decoding not supported in this environment');
}

