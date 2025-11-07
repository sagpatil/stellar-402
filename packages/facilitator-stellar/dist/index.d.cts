import { z } from 'zod';
import { Application } from 'express';

declare const configSchema: z.ZodObject<{
    PORT: z.ZodDefault<z.ZodNumber>;
    STELLAR_HORIZON_URL: z.ZodDefault<z.ZodString>;
    SOROBAN_RPC_URL: z.ZodDefault<z.ZodString>;
    STELLAR_NETWORK_PASSPHRASE: z.ZodDefault<z.ZodString>;
    FEE_SPONSOR_SECRET: z.ZodString;
    SUPPORTED_ASSETS: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    PORT: number;
    STELLAR_HORIZON_URL: string;
    SOROBAN_RPC_URL: string;
    STELLAR_NETWORK_PASSPHRASE: string;
    FEE_SPONSOR_SECRET: string;
    SUPPORTED_ASSETS: string;
}, {
    FEE_SPONSOR_SECRET: string;
    PORT?: number | undefined;
    STELLAR_HORIZON_URL?: string | undefined;
    SOROBAN_RPC_URL?: string | undefined;
    STELLAR_NETWORK_PASSPHRASE?: string | undefined;
    SUPPORTED_ASSETS?: string | undefined;
}>;
type AppConfig = z.infer<typeof configSchema> & {
    supportedAssetsList: string[];
};
declare const loadConfig: (env: NodeJS.ProcessEnv) => AppConfig;

declare const paymentRequirementsSchema: z.ZodObject<{
    scheme: z.ZodLiteral<"exact">;
    network: z.ZodDefault<z.ZodEnum<["stellar-testnet", "stellar-mainnet", "stellar-futurenet"]>>;
    resource: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    maxTimeoutSeconds: z.ZodNumber;
    maxAmountRequired: z.ZodString;
    payTo: z.ZodString;
    asset: z.ZodString;
    extra: z.ZodObject<{
        networkPassphrase: z.ZodString;
        feeSponsor: z.ZodString;
        sep10Domain: z.ZodOptional<z.ZodString>;
        contractId: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        networkPassphrase: z.ZodString;
        feeSponsor: z.ZodString;
        sep10Domain: z.ZodOptional<z.ZodString>;
        contractId: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        networkPassphrase: z.ZodString;
        feeSponsor: z.ZodString;
        sep10Domain: z.ZodOptional<z.ZodString>;
        contractId: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    scheme: "exact";
    network: "stellar-testnet" | "stellar-mainnet" | "stellar-futurenet";
    resource: string;
    maxTimeoutSeconds: number;
    maxAmountRequired: string;
    payTo: string;
    asset: string;
    extra: {
        networkPassphrase: string;
        feeSponsor: string;
        sep10Domain?: string | undefined;
        contractId?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    description?: string | undefined;
    mimeType?: string | undefined;
}, {
    scheme: "exact";
    resource: string;
    maxTimeoutSeconds: number;
    maxAmountRequired: string;
    payTo: string;
    asset: string;
    extra: {
        networkPassphrase: string;
        feeSponsor: string;
        sep10Domain?: string | undefined;
        contractId?: string | undefined;
    } & {
        [k: string]: unknown;
    };
    network?: "stellar-testnet" | "stellar-mainnet" | "stellar-futurenet" | undefined;
    description?: string | undefined;
    mimeType?: string | undefined;
}>;
type PaymentRequirements = z.infer<typeof paymentRequirementsSchema>;
declare const paymentHeaderSchema: z.ZodObject<{
    x402Version: z.ZodLiteral<1>;
    scheme: z.ZodLiteral<"exact">;
    network: z.ZodString;
    payload: z.ZodObject<{
        transactionXdr: z.ZodString;
        networkPassphrase: z.ZodString;
        signatures: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        metadata: z.ZodOptional<z.ZodObject<{
            memo: z.ZodOptional<z.ZodString>;
            preparedAt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            memo?: string | undefined;
            preparedAt?: string | undefined;
        }, {
            memo?: string | undefined;
            preparedAt?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        networkPassphrase: string;
        transactionXdr: string;
        signatures?: string[] | undefined;
        metadata?: {
            memo?: string | undefined;
            preparedAt?: string | undefined;
        } | undefined;
    }, {
        networkPassphrase: string;
        transactionXdr: string;
        signatures?: string[] | undefined;
        metadata?: {
            memo?: string | undefined;
            preparedAt?: string | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    scheme: "exact";
    network: string;
    x402Version: 1;
    payload: {
        networkPassphrase: string;
        transactionXdr: string;
        signatures?: string[] | undefined;
        metadata?: {
            memo?: string | undefined;
            preparedAt?: string | undefined;
        } | undefined;
    };
}, {
    scheme: "exact";
    network: string;
    x402Version: 1;
    payload: {
        networkPassphrase: string;
        transactionXdr: string;
        signatures?: string[] | undefined;
        metadata?: {
            memo?: string | undefined;
            preparedAt?: string | undefined;
        } | undefined;
    };
}>;
type PaymentHeader = z.infer<typeof paymentHeaderSchema>;
interface VerificationResult {
    isValid: boolean;
    invalidReason?: string;
    details?: Record<string, unknown>;
}
interface SettlementResult {
    success: boolean;
    txHash?: string;
    networkId?: string;
    ledger?: number;
    error?: string;
}

declare const SorobanRpc: any;
type SorobanServer = InstanceType<typeof SorobanRpc.Server>;
type HorizonServerConstructor = new (serverUrl: string) => {
    submitTransaction: (...args: unknown[]) => Promise<unknown>;
    loadAccount: (...args: unknown[]) => Promise<unknown>;
};
type HorizonServerInstance = InstanceType<HorizonServerConstructor>;
interface StellarClients {
    horizon: HorizonServerInstance;
    soroban: SorobanServer;
}

interface VerifyDependencies {
    config: AppConfig;
    now?: () => Date;
    clients?: StellarClients;
}
declare const createVerifier: ({ config, now, clients }: VerifyDependencies) => {
    verify: (header: PaymentHeader, requirements: PaymentRequirements) => Promise<VerificationResult>;
};

interface SettlementDependencies {
    config: AppConfig;
    clients?: StellarClients;
}
declare const createSettlement: ({ config, clients }: SettlementDependencies) => {
    settle: (header: PaymentHeader, requirements: PaymentRequirements) => Promise<SettlementResult>;
};

interface FacilitatorApp {
    app: Application;
    config: AppConfig;
}
declare const createApp: () => FacilitatorApp;

export { type AppConfig, type FacilitatorApp, type PaymentHeader, type PaymentRequirements, type SettlementDependencies, type SettlementResult, type VerificationResult, type VerifyDependencies, createApp, createSettlement, createVerifier, loadConfig, paymentHeaderSchema, paymentRequirementsSchema };
