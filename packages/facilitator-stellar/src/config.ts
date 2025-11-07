import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4021),
  STELLAR_HORIZON_URL: z
    .string()
    .default('https://horizon-testnet.stellar.org'),
  SOROBAN_RPC_URL: z
    .string()
    .default('https://soroban-testnet.stellar.org'),
  STELLAR_NETWORK_PASSPHRASE: z
    .string()
    .default('Test SDF Network ; September 2015'),
  FEE_SPONSOR_SECRET: z.string().min(56, 'fee sponsor secret is required'),
  SUPPORTED_ASSETS: z
    .string()
    .default('XLM')
});

export type AppConfig = z.infer<typeof configSchema> & {
  supportedAssetsList: string[];
};

export const loadConfig = (env: NodeJS.ProcessEnv): AppConfig => {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuration validation failed:\n${formatted}`);
  }

  const data = parsed.data;
  return {
    ...data,
    supportedAssetsList: data.SUPPORTED_ASSETS.split(',').map((asset) => asset.trim()).filter(Boolean)
  };
};

