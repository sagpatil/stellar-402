import { z } from 'zod';

export const paymentRequirementsSchema = z.object({
  scheme: z.literal('exact'),
  network: z.enum(['stellar-testnet', 'stellar-mainnet', 'stellar-futurenet']).default('stellar-testnet'),
  resource: z.string().url(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  maxTimeoutSeconds: z.number().int().positive(),
  maxAmountRequired: z.string().regex(/^[0-9]+$/, 'amount must be provided in stroops'),
  payTo: z.string().length(56),
  asset: z.string(),
  extra: z
    .object({
      networkPassphrase: z.string(),
      feeSponsor: z.string().length(56),
      sep10Domain: z.string().url().optional(),
      contractId: z.string().optional()
    })
    .passthrough()
});

export type PaymentRequirements = z.infer<typeof paymentRequirementsSchema>;

export const paymentHeaderSchema = z.object({
  x402Version: z.literal(1),
  scheme: z.literal('exact'),
  network: z.string(),
  payload: z.object({
    transactionXdr: z.string(),
    networkPassphrase: z.string(),
    signatures: z.array(z.string()).optional(),
    metadata: z
      .object({
        memo: z.string().optional(),
        preparedAt: z.string().optional()
      })
      .optional()
  })
});

export type PaymentHeader = z.infer<typeof paymentHeaderSchema>;

export interface VerificationResult {
  isValid: boolean;
  invalidReason?: string;
  details?: Record<string, unknown>;
}

export interface SettlementResult {
  success: boolean;
  txHash?: string;
  networkId?: string;
  ledger?: number;
  error?: string;
}

