import express, { type Application, Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { config as loadEnv } from 'dotenv';
import { loadConfig, type AppConfig } from './config.js';
import { createLogger } from './logger.js';
import { paymentHeaderSchema, paymentRequirementsSchema } from './types.js';
import { createVerifier } from './verify.js';
import { createSettlement } from './settle.js';

loadEnv();

const logger = createLogger();

export interface FacilitatorApp {
  app: Application;
  config: AppConfig;
}

export const createApp = (): FacilitatorApp => {
  const config = loadConfig(process.env);
  const verifier = createVerifier({ config });
  const settlement = createSettlement({ config });

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  app.get('/supported', (_req: Request, res: Response) => {
    res.json([
      {
        scheme: 'exact',
        network: 'stellar-testnet',
        feeSponsor: config.FEE_SPONSOR_SECRET ? 'HIDDEN' : null,
        assets: config.supportedAssetsList
      }
    ]);
  });

  app.post('/verify', async (req: Request, res: Response) => {
    const headerInput = coerceHeader(req.body.paymentHeader);
    const parsedHeader = paymentHeaderSchema.safeParse(headerInput);
    const parsedRequirements = paymentRequirementsSchema.safeParse(req.body.paymentRequirements);

    if (!parsedHeader.success || !parsedRequirements.success) {
      return res.status(400).json({
        isValid: false,
        invalidReason: 'INVALID_PAYLOAD',
        errors: {
          header: parsedHeader.success ? null : parsedHeader.error.flatten(),
          requirements: parsedRequirements.success ? null : parsedRequirements.error.flatten()
        }
      });
    }

    const result = await verifier.verify(parsedHeader.data, parsedRequirements.data);
    const status = result.isValid ? 200 : 422;
    res.status(status).json(result);
  });

  app.post('/settle', async (req: Request, res: Response) => {
    const headerInput = coerceHeader(req.body.paymentHeader);
    const parsedHeader = paymentHeaderSchema.safeParse(headerInput);
    const parsedRequirements = paymentRequirementsSchema.safeParse(req.body.paymentRequirements);

    if (!parsedHeader.success || !parsedRequirements.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PAYLOAD'
      });
    }

    const result = await settlement.settle(parsedHeader.data, parsedRequirements.data);
    const status = result.success ? 200 : 502;
    res.status(status).json(result);
  });

  return { app, config };
};

const coerceHeader = (input: unknown) => {
  if (typeof input === 'string') {
    try {
      const decoded = Buffer.from(input, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      return parsed;
    } catch (error) {
      return input;
    }
  }
  return input;
};

if (process.env.NODE_ENV !== 'test') {
  const { app, config } = createApp();
  const port = config.PORT;
  app.listen(port, () => {
    logger.info({ port }, 'stellar facilitator listening');
  });
}

