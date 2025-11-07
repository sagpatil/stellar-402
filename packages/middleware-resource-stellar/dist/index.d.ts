import * as express from 'express';
import { RequestHandler } from 'express';
import { z } from 'zod';

declare const paymentRequirementsSchema: z.ZodObject<{
    scheme: z.ZodLiteral<"exact">;
    network: z.ZodEnum<["stellar-mainnet", "stellar-testnet", "stellar-futurenet"]>;
    resource: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    maxTimeoutSeconds: z.ZodNumber;
    maxAmountRequired: z.ZodString;
    payTo: z.ZodString;
    asset: z.ZodString;
    extra: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    scheme: "exact";
    network: "stellar-mainnet" | "stellar-testnet" | "stellar-futurenet";
    resource: string;
    maxTimeoutSeconds: number;
    maxAmountRequired: string;
    payTo: string;
    asset: string;
    description?: string | undefined;
    mimeType?: string | undefined;
    extra?: Record<string, unknown> | undefined;
}, {
    scheme: "exact";
    network: "stellar-mainnet" | "stellar-testnet" | "stellar-futurenet";
    resource: string;
    maxTimeoutSeconds: number;
    maxAmountRequired: string;
    payTo: string;
    asset: string;
    description?: string | undefined;
    mimeType?: string | undefined;
    extra?: Record<string, unknown> | undefined;
}>;
type PaymentRequirements = z.infer<typeof paymentRequirementsSchema>;
declare const paymentHeaderSchema: z.ZodString;
interface VerifyResponse {
    isValid: boolean;
    invalidReason?: string;
    details?: Record<string, unknown>;
}
interface SettleResponse {
    success: boolean;
    txHash?: string;
    networkId?: string;
    ledger?: number;
    error?: string;
}
interface FacilitatorClient {
    verify: (payload: FacilitatorPayload) => Promise<VerifyResponse>;
    settle: (payload: FacilitatorPayload) => Promise<SettleResponse>;
}
interface FacilitatorPayload {
    paymentHeader: string;
    paymentRequirements: PaymentRequirements;
}
interface MiddlewareOptions {
    requirementProvider: RequirementProvider;
    facilitator: FacilitatorClient | FacilitatorClientOptions;
    fetchImpl?: typeof fetch;
    logger?: Logger;
    headerName?: string;
}
interface FacilitatorClientOptions {
    verifyUrl: string;
    settleUrl: string;
    fetchImpl?: typeof fetch;
    headers?: Record<string, string>;
}
type RequirementProvider = (request: express.Request) => Promise<PaymentRequirements> | PaymentRequirements;
interface Logger {
    info: (msg: string, context?: Record<string, unknown>) => void;
    error: (msg: string, context?: Record<string, unknown>) => void;
}
interface PaymentRequiredBody {
    error: string;
    paymentRequirements: PaymentRequirements;
    invalidReason?: string;
}

declare function createStellarPaymentMiddleware(options: MiddlewareOptions): RequestHandler;

export { type FacilitatorClient, type FacilitatorClientOptions, type FacilitatorPayload, type Logger, type MiddlewareOptions, type PaymentRequiredBody, type PaymentRequirements, type RequirementProvider, type SettleResponse, type VerifyResponse, createStellarPaymentMiddleware, paymentHeaderSchema, paymentRequirementsSchema };
