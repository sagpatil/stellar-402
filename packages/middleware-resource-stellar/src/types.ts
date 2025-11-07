import { z } from 'zod';

export const paymentRequirementsSchema = z.object({
  scheme: z.literal('exact'),
  network: z.enum(['stellar-mainnet', 'stellar-testnet', 'stellar-futurenet']),
  resource: z.string().url(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  maxTimeoutSeconds: z.number().int().positive(),
  maxAmountRequired: z.string().regex(/^[0-9]+$/, 'amount must be a stroop integer string'),
  payTo: z.string().length(56),
  asset: z.string(),
  extra: z
    .record(z.unknown())
    .optional()
});

export type PaymentRequirements = z.infer<typeof paymentRequirementsSchema>;

export const paymentHeaderSchema = z.string().min(1);

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  details?: Record<string, unknown>;
}

export interface SettleResponse {
  success: boolean;
  txHash?: string;
  networkId?: string;
  ledger?: number;
  error?: string;
}

export interface FacilitatorClient {
  verify: (payload: FacilitatorPayload) => Promise<VerifyResponse>;
  settle: (payload: FacilitatorPayload) => Promise<SettleResponse>;
}

export interface FacilitatorPayload {
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
}

export interface MiddlewareOptions {
  requirementProvider: RequirementProvider;
  facilitator: FacilitatorClient | FacilitatorClientOptions;
  fetchImpl?: typeof fetch;
  logger?: Logger;
  headerName?: string;
}

export interface FacilitatorClientOptions {
  verifyUrl: string;
  settleUrl: string;
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
}

export type RequirementProvider = (
  request: import('express').Request
) => Promise<PaymentRequirements> | PaymentRequirements;

export interface Logger {
  info: (msg: string, context?: Record<string, unknown>) => void;
  error: (msg: string, context?: Record<string, unknown>) => void;
}

export interface PaymentRequiredBody {
  error: string;
  paymentRequirements: PaymentRequirements;
  invalidReason?: string;
}

