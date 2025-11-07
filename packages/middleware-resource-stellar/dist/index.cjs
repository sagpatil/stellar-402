"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createStellarPaymentMiddleware: () => createStellarPaymentMiddleware,
  paymentHeaderSchema: () => paymentHeaderSchema,
  paymentRequirementsSchema: () => paymentRequirementsSchema
});
module.exports = __toCommonJS(index_exports);

// src/middleware.ts
var import_cross_fetch = __toESM(require("cross-fetch"), 1);

// src/types.ts
var import_zod = require("zod");
var paymentRequirementsSchema = import_zod.z.object({
  scheme: import_zod.z.literal("exact"),
  network: import_zod.z.enum(["stellar-mainnet", "stellar-testnet", "stellar-futurenet"]),
  resource: import_zod.z.string().url(),
  description: import_zod.z.string().optional(),
  mimeType: import_zod.z.string().optional(),
  maxTimeoutSeconds: import_zod.z.number().int().positive(),
  maxAmountRequired: import_zod.z.string().regex(/^[0-9]+$/, "amount must be a stroop integer string"),
  payTo: import_zod.z.string().length(56),
  asset: import_zod.z.string(),
  extra: import_zod.z.record(import_zod.z.unknown()).optional()
});
var paymentHeaderSchema = import_zod.z.string().min(1);

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
  const fetchImpl = options.fetchImpl ?? globalThis.fetch ?? import_cross_fetch.default;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createStellarPaymentMiddleware,
  paymentHeaderSchema,
  paymentRequirementsSchema
});
