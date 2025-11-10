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
  createApp: () => createApp,
  createSettlement: () => createSettlement,
  createVerifier: () => createVerifier,
  loadConfig: () => loadConfig,
  paymentHeaderSchema: () => paymentHeaderSchema,
  paymentRequirementsSchema: () => paymentRequirementsSchema
});
module.exports = __toCommonJS(index_exports);

// src/config.ts
var import_zod = require("zod");
var configSchema = import_zod.z.object({
  PORT: import_zod.z.coerce.number().int().positive().default(4021),
  STELLAR_HORIZON_URL: import_zod.z.string().default("https://horizon-testnet.stellar.org"),
  SOROBAN_RPC_URL: import_zod.z.string().default("https://soroban-testnet.stellar.org"),
  STELLAR_NETWORK_PASSPHRASE: import_zod.z.string().default("Test SDF Network ; September 2015"),
  FEE_SPONSOR_SECRET: import_zod.z.string().min(56, "fee sponsor secret is required"),
  SUPPORTED_ASSETS: import_zod.z.string().default("XLM")
});
var loadConfig = (env) => {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const formatted = parsed.error.issues.map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`).join("\n");
    throw new Error(`Configuration validation failed:
${formatted}`);
  }
  const data = parsed.data;
  return {
    ...data,
    supportedAssetsList: data.SUPPORTED_ASSETS.split(",").map((asset) => asset.trim()).filter(Boolean)
  };
};

// src/types.ts
var import_zod2 = require("zod");
var paymentRequirementsSchema = import_zod2.z.object({
  scheme: import_zod2.z.literal("exact"),
  network: import_zod2.z.enum(["stellar-testnet", "stellar-mainnet", "stellar-futurenet"]).default("stellar-testnet"),
  resource: import_zod2.z.string().url(),
  description: import_zod2.z.string().optional(),
  mimeType: import_zod2.z.string().optional(),
  maxTimeoutSeconds: import_zod2.z.number().int().positive(),
  maxAmountRequired: import_zod2.z.string().regex(/^[0-9]+$/, "amount must be provided in stroops"),
  payTo: import_zod2.z.string().length(56),
  asset: import_zod2.z.string(),
  extra: import_zod2.z.object({
    networkPassphrase: import_zod2.z.string(),
    feeSponsor: import_zod2.z.string().length(56),
    sep10Domain: import_zod2.z.string().url().optional(),
    contractId: import_zod2.z.string().optional()
  }).passthrough()
});
var paymentHeaderSchema = import_zod2.z.object({
  x402Version: import_zod2.z.literal(1),
  scheme: import_zod2.z.literal("exact"),
  network: import_zod2.z.string(),
  payload: import_zod2.z.object({
    transactionXdr: import_zod2.z.string(),
    networkPassphrase: import_zod2.z.string(),
    signatures: import_zod2.z.array(import_zod2.z.string()).optional(),
    metadata: import_zod2.z.object({
      memo: import_zod2.z.string().optional(),
      preparedAt: import_zod2.z.string().optional()
    }).optional()
  })
});

// src/verify.ts
var import_stellar_sdk2 = require("stellar-sdk");

// src/stellar.ts
var StellarSdk = __toESM(require("stellar-sdk"), 1);
var import_stellar_sdk = __toESM(require("@stellar/stellar-sdk"), 1);
var { SorobanRpc } = import_stellar_sdk.default;
var HorizonCtor = StellarSdk.Horizon?.Server ?? null;
if (!HorizonCtor) {
  throw new Error("StellarSdk.Horizon.Server is not available. Check stellar-sdk version compatibility.");
}
var createHorizonServer = (url) => new HorizonCtor(url);
var createClients = (horizonUrl, sorobanUrl) => ({
  horizon: createHorizonServer(horizonUrl),
  soroban: new SorobanRpc.Server(sorobanUrl)
});
var decodeTransaction = (payload) => {
  const envelope = payload.transactionXdr;
  return new StellarSdk.Transaction(envelope, payload.networkPassphrase);
};
var ensureNetworkPassphrase = (payload, requirements) => {
  if (payload.networkPassphrase !== requirements.extra.networkPassphrase) {
    throw new Error("NETWORK_PASSPHRASE_MISMATCH");
  }
};
var ensureAssetSupported = (requirements, supportedAssets) => {
  if (!supportedAssets.includes(requirements.asset)) {
    throw new Error("ASSET_NOT_SUPPORTED");
  }
};
var ensurePaymentOperation = (tx, requirements) => {
  const operations = tx.operations;
  if (operations.length !== 1) {
    throw new Error("UNEXPECTED_OPERATION_COUNT");
  }
  const [operation] = operations;
  if (operation.type !== "payment") {
    throw new Error("UNSUPPORTED_OPERATION");
  }
  if ("amount" in operation) {
    const operationStroops = amountToStroops(operation.amount);
    if (operationStroops !== requirements.maxAmountRequired) {
      throw new Error("AMOUNT_MISMATCH");
    }
  }
  if ("destination" in operation && operation.destination !== requirements.payTo) {
    throw new Error("DESTINATION_MISMATCH");
  }
};
var stroopsToAmount = (stroops) => {
  const bigIntValue = BigInt(stroops);
  const stroopsPerXlm = BigInt(1e7);
  const whole = bigIntValue / stroopsPerXlm;
  const fraction = bigIntValue % stroopsPerXlm;
  const fractionStr = fraction.toString().padStart(7, "0").replace(/0+$/, "");
  return fractionStr.length > 0 ? `${whole.toString()}.${fractionStr}` : whole.toString();
};
var amountToStroops = (xlm) => {
  const parts = xlm.split(".");
  const whole = BigInt(parts[0]);
  const fraction = parts[1] ?? "0";
  const normalizedFraction = (fraction + "0000000").slice(0, 7);
  const stroopsPerXlm = BigInt(1e7);
  const total = whole * stroopsPerXlm + BigInt(normalizedFraction);
  return total.toString();
};
var buildFeeBump = (original, feeSponsorSecret, baseFeeMultiplier = 5) => {
  const sponsor = StellarSdk.Keypair.fromSecret(feeSponsorSecret);
  const baseFee = (parseInt(original.fee, 10) * baseFeeMultiplier).toString();
  const feeBump = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
    sponsor,
    baseFee,
    original,
    original.networkPassphrase
  );
  feeBump.sign(sponsor);
  return feeBump;
};
var submitTransaction = async (clients, tx) => {
  const response = await clients.horizon.submitTransaction(tx);
  return response;
};
var isTestnet = (requirements) => requirements.network === "stellar-testnet";

// src/verify.ts
var createVerifier = ({ config, now = () => /* @__PURE__ */ new Date(), clients }) => {
  const stellarClients = clients ?? createClients(config.STELLAR_HORIZON_URL, config.SOROBAN_RPC_URL);
  const verify = async (header, requirements) => {
    try {
      ensureNetworkPassphrase(header.payload, requirements);
      ensureAssetSupported(requirements, config.supportedAssetsList);
      if (!isTestnet(requirements)) {
        return {
          isValid: false,
          invalidReason: "UNSUPPORTED_NETWORK"
        };
      }
      const tx = decodeTransaction(header.payload);
      ensurePaymentOperation(tx, requirements);
      if (!tx.timeBounds) {
        throw new Error("MISSING_TIMEBOUNDS");
      }
      const currentSeconds = Math.floor(now().getTime() / 1e3);
      if (tx.timeBounds?.minTime && Number(tx.timeBounds.minTime) > currentSeconds) {
        throw new Error("TIMEBOUND_TOO_EARLY");
      }
      if (tx.timeBounds?.maxTime && Number(tx.timeBounds.maxTime) < currentSeconds) {
        throw new Error("TIMEBOUND_EXPIRED");
      }
      const maxTimeoutSeconds = requirements.maxTimeoutSeconds;
      if (tx.timeBounds.maxTime && Number(tx.timeBounds.maxTime) - currentSeconds > maxTimeoutSeconds) {
        throw new Error("TIMEBOUND_TOO_LONG");
      }
      if (Number(tx.fee) === 0) {
        throw new Error("FEE_TOO_LOW");
      }
      await simulateBalance(stellarClients, requirements.payTo);
      return {
        isValid: true,
        details: {
          amount: stroopsToAmount(requirements.maxAmountRequired)
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          isValid: false,
          invalidReason: error.message
        };
      }
      return {
        isValid: false,
        invalidReason: "UNKNOWN_ERROR"
      };
    }
  };
  return { verify };
};
var simulateBalance = async (clients, accountId) => {
  try {
    await clients.horizon.loadAccount(accountId);
  } catch (error) {
    if (isAccountMissingError(error)) {
      throw new Error("DESTINATION_ACCOUNT_MISSING");
    }
    throw error;
  }
};
function isAccountMissingError(error) {
  if (error instanceof Error) {
    const horizonError = error;
    if (horizonError.response?.status === 404) {
      return true;
    }
    const { NotFoundError } = import_stellar_sdk2.Horizon;
    if (NotFoundError && error instanceof NotFoundError) {
      return true;
    }
  }
  return false;
}

// src/settle.ts
var createSettlement = ({ config, clients }) => {
  const stellarClients = clients ?? createClients(config.STELLAR_HORIZON_URL, config.SOROBAN_RPC_URL);
  const settle = async (header, requirements) => {
    try {
      ensureNetworkPassphrase(header.payload, requirements);
      ensureAssetSupported(requirements, config.supportedAssetsList);
      const tx = decodeTransaction(header.payload);
      ensurePaymentOperation(tx, requirements);
      const feeBump = buildFeeBump(tx, config.FEE_SPONSOR_SECRET);
      const response = await submitTransaction(stellarClients, feeBump);
      return {
        success: true,
        txHash: typeof response.hash === "string" ? response.hash : void 0,
        networkId: requirements.network,
        ledger: typeof response.ledger === "number" ? response.ledger : void 0
      };
    } catch (error) {
      console.error("Settlement error:", error);
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message
        };
      }
      return {
        success: false,
        error: "UNKNOWN_ERROR"
      };
    }
  };
  return { settle };
};

// src/server.ts
var import_express = __toESM(require("express"), 1);
var import_pino_http = __toESM(require("pino-http"), 1);
var import_dotenv = require("dotenv");

// src/logger.ts
var import_pino = __toESM(require("pino"), 1);
var createLogger = () => (0, import_pino.default)({
  name: "stellar-x402-facilitator",
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.env.NODE_ENV === "production" ? void 0 : { target: "pino-pretty", options: { colorize: true } }
});

// src/server.ts
(0, import_dotenv.config)();
var logger = createLogger();
var createApp = () => {
  const config = loadConfig(process.env);
  const verifier = createVerifier({ config });
  const settlement = createSettlement({ config });
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "1mb" }));
  app.use((0, import_pino_http.default)({ logger }));
  app.get("/supported", (_req, res) => {
    res.json([
      {
        scheme: "exact",
        network: "stellar-testnet",
        feeSponsor: config.FEE_SPONSOR_SECRET ? "HIDDEN" : null,
        assets: config.supportedAssetsList
      }
    ]);
  });
  app.post("/verify", async (req, res) => {
    const headerInput = coerceHeader(req.body.paymentHeader);
    const parsedHeader = paymentHeaderSchema.safeParse(headerInput);
    const parsedRequirements = paymentRequirementsSchema.safeParse(req.body.paymentRequirements);
    if (!parsedHeader.success || !parsedRequirements.success) {
      return res.status(400).json({
        isValid: false,
        invalidReason: "INVALID_PAYLOAD",
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
  app.post("/settle", async (req, res) => {
    const headerInput = coerceHeader(req.body.paymentHeader);
    const parsedHeader = paymentHeaderSchema.safeParse(headerInput);
    const parsedRequirements = paymentRequirementsSchema.safeParse(req.body.paymentRequirements);
    if (!parsedHeader.success || !parsedRequirements.success) {
      return res.status(400).json({
        success: false,
        error: "INVALID_PAYLOAD"
      });
    }
    const result = await settlement.settle(parsedHeader.data, parsedRequirements.data);
    const status = result.success ? 200 : 502;
    res.status(status).json(result);
  });
  return { app, config };
};
var coerceHeader = (input) => {
  if (typeof input === "string") {
    try {
      const decoded = Buffer.from(input, "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      return parsed;
    } catch (error) {
      return input;
    }
  }
  return input;
};
if (process.env.NODE_ENV !== "test") {
  const { app, config } = createApp();
  const port = config.PORT;
  app.listen(port, () => {
    logger.info({ port }, "stellar facilitator listening");
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createApp,
  createSettlement,
  createVerifier,
  loadConfig,
  paymentHeaderSchema,
  paymentRequirementsSchema
});
