// src/middleware.ts
import fetch from "cross-fetch";

// src/types.ts
import { z } from "zod";
var paymentRequirementsSchema = z.object({
  scheme: z.literal("exact"),
  network: z.enum(["stellar-mainnet", "stellar-testnet", "stellar-futurenet"]),
  resource: z.string().url(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  maxTimeoutSeconds: z.number().int().positive(),
  maxAmountRequired: z.string().regex(/^[0-9]+$/, "amount must be a stroop integer string"),
  payTo: z.string().length(56),
  asset: z.string(),
  extra: z.record(z.unknown()).optional()
});
var paymentHeaderSchema = z.string().min(1);

// src/middleware.ts
var DEFAULT_HEADER = "x-payment";
function createStellarPaymentMiddleware(options) {
  const headerName = (options.headerName ?? DEFAULT_HEADER).toLowerCase();
  const logger = options.logger ?? createNoopLogger();
  const requirementProvider = options.requirementProvider;
  const facilitator = normalizeFacilitator(options.facilitator, options.fetchImpl);
  return async function stellarPaymentMiddleware(req, res, next) {
    try {
      const requirementInput = await Promise.resolve(requirementProvider(req));
      const paymentRequirements = paymentRequirementsSchema.parse(requirementInput);
      const paymentHeaderRaw = req.header(headerName);
      if (!paymentHeaderRaw) {
        respondWith402(res, paymentRequirements);
        return;
      }
      let paymentHeader;
      try {
        paymentHeader = paymentHeaderSchema.parse(paymentHeaderRaw);
      } catch (error) {
        logger.error("stellar.payment.invalid-header", { error });
        respondWith402(res, paymentRequirements, "INVALID_PAYMENT_HEADER");
        return;
      }
      const payload = {
        paymentHeader,
        paymentRequirements
      };
      const verifyResult = await facilitator.verify(payload);
      if (!verifyResult.isValid) {
        logger.info("stellar.payment.verify.failed", { reason: verifyResult.invalidReason });
        respondWith402(res, paymentRequirements, verifyResult.invalidReason ?? "VERIFICATION_FAILED");
        return;
      }
      const settleResult = await facilitator.settle(payload);
      if (!settleResult.success) {
        logger.error("stellar.payment.settle.failed", { error: settleResult.error });
        respondWith402(res, paymentRequirements, settleResult.error ?? "SETTLEMENT_FAILED");
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
function normalizeFacilitator(facilitator, fetchOverride) {
  if (typeof facilitator.verify === "function") {
    return facilitator;
  }
  return createHttpFacilitatorClient({ ...facilitator, fetchImpl: fetchOverride });
}
function createHttpFacilitatorClient(options) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch ?? fetch;
  if (!fetchImpl) {
    throw new Error("No fetch implementation available for facilitator client");
  }
  const headers = {
    "content-type": "application/json",
    ...options.headers ?? {}
  };
  const post = async (url, payload) => {
    const response = await fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Facilitator request failed (${response.status}): ${text}`);
    }
    return await response.json();
  };
  return {
    verify: (payload) => post(options.verifyUrl, payload),
    settle: (payload) => post(options.settleUrl, payload)
  };
}
function respondWith402(res, requirements, invalidReason) {
  const body = {
    error: "PAYMENT_REQUIRED",
    paymentRequirements: requirements
  };
  if (invalidReason) {
    body.invalidReason = invalidReason;
  }
  res.status(402).json(body);
}
function attachPaymentResponse(res, settle) {
  const headerPayload = {
    success: true,
    txHash: settle.txHash,
    networkId: settle.networkId,
    ledger: settle.ledger
  };
  const encoded = Buffer.from(JSON.stringify(headerPayload), "utf8").toString("base64");
  res.set("X-PAYMENT-RESPONSE", encoded);
}
function createNoopLogger() {
  return {
    info: () => void 0,
    error: () => void 0
  };
}
export {
  createStellarPaymentMiddleware,
  paymentHeaderSchema,
  paymentRequirementsSchema
};
