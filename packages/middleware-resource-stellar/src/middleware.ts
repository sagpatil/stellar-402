import type { Request, Response, NextFunction, RequestHandler } from 'express';
import fetch from 'cross-fetch';

import {
  paymentRequirementsSchema,
  paymentHeaderSchema,
  type MiddlewareOptions,
  type PaymentRequirements,
  type FacilitatorPayload,
  type FacilitatorClient,
  type FacilitatorClientOptions,
  type VerifyResponse,
  type SettleResponse,
  type Logger,
  type PaymentRequiredBody
} from './types.js';

const DEFAULT_HEADER = 'x-payment';

export function createStellarPaymentMiddleware(options: MiddlewareOptions): RequestHandler {
  const headerName = (options.headerName ?? DEFAULT_HEADER).toLowerCase();
  const logger = options.logger ?? createNoopLogger();
  const requirementProvider = options.requirementProvider;
  const facilitator = normalizeFacilitator(options.facilitator, options.fetchImpl);

  return async function stellarPaymentMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      const requirementInput = await Promise.resolve(requirementProvider(req));
      const paymentRequirements = paymentRequirementsSchema.parse(requirementInput);

      const paymentHeaderRaw = req.header(headerName);
      if (!paymentHeaderRaw) {
        respondWith402(res, paymentRequirements);
        return;
      }

      let paymentHeader: string;
      try {
        paymentHeader = paymentHeaderSchema.parse(paymentHeaderRaw);
      } catch (error) {
        logger.error('stellar.payment.invalid-header', { error });
        respondWith402(res, paymentRequirements, 'INVALID_PAYMENT_HEADER');
        return;
      }

      const payload: FacilitatorPayload = {
        paymentHeader,
        paymentRequirements
      };

      const verifyResult = await facilitator.verify(payload);
      if (!verifyResult.isValid) {
        logger.info('stellar.payment.verify.failed', { reason: verifyResult.invalidReason });
        respondWith402(res, paymentRequirements, verifyResult.invalidReason ?? 'VERIFICATION_FAILED');
        return;
      }

      const settleResult = await facilitator.settle(payload);
      if (!settleResult.success) {
        logger.error('stellar.payment.settle.failed', { error: settleResult.error });
        respondWith402(res, paymentRequirements, settleResult.error ?? 'SETTLEMENT_FAILED');
        return;
      }

      attachPaymentResponse(res, settleResult);

      res.locals.stellarPayment = {
        requirements: paymentRequirements,
        verify: verifyResult,
        settle: settleResult
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

function normalizeFacilitator(
  facilitator: FacilitatorClient | FacilitatorClientOptions,
  fetchOverride?: typeof fetch
): FacilitatorClient {
  if (typeof (facilitator as FacilitatorClient).verify === 'function') {
    return facilitator as FacilitatorClient;
  }
  return createHttpFacilitatorClient({ ...(facilitator as FacilitatorClientOptions), fetchImpl: fetchOverride });
}

function createHttpFacilitatorClient(options: FacilitatorClientOptions): FacilitatorClient {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch ?? fetch;
  if (!fetchImpl) {
    throw new Error('No fetch implementation available for facilitator client');
  }

  const headers = {
    'content-type': 'application/json',
    ...(options.headers ?? {})
  };

  const post = async <T extends VerifyResponse | SettleResponse>(url: string, payload: FacilitatorPayload): Promise<T> => {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Facilitator request failed (${response.status}): ${text}`);
    }
    return (await response.json()) as T;
  };

  return {
    verify: (payload) => post<VerifyResponse>(options.verifyUrl, payload),
    settle: (payload) => post<SettleResponse>(options.settleUrl, payload)
  };
}

function respondWith402(res: Response, requirements: PaymentRequirements, invalidReason?: string) {
  const body: PaymentRequiredBody = {
    error: 'PAYMENT_REQUIRED',
    paymentRequirements: requirements
  };

  if (invalidReason) {
    body.invalidReason = invalidReason;
  }

  res.status(402).json(body);
}

function attachPaymentResponse(res: Response, settle: SettleResponse) {
  const headerPayload = {
    success: true,
    txHash: settle.txHash,
    networkId: settle.networkId,
    ledger: settle.ledger
  };

  const encoded = Buffer.from(JSON.stringify(headerPayload), 'utf8').toString('base64');
  res.set('X-PAYMENT-RESPONSE', encoded);
}

function createNoopLogger(): Logger {
  return {
    info: () => undefined,
    error: () => undefined
  };
}

