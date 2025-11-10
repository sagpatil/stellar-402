// src/config.ts
import { z } from "zod";
var configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4021),
  STELLAR_HORIZON_URL: z.string().default("https://horizon-testnet.stellar.org"),
  SOROBAN_RPC_URL: z.string().default("https://soroban-testnet.stellar.org"),
  STELLAR_NETWORK_PASSPHRASE: z.string().default("Test SDF Network ; September 2015"),
  FEE_SPONSOR_SECRET: z.string().min(56, "fee sponsor secret is required"),
  SUPPORTED_ASSETS: z.string().default("XLM")
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
import { z as z2 } from "zod";
var paymentRequirementsSchema = z2.object({
  scheme: z2.literal("exact"),
  network: z2.enum(["stellar-testnet", "stellar-mainnet", "stellar-futurenet"]).default("stellar-testnet"),
  resource: z2.string().url(),
  description: z2.string().optional(),
  mimeType: z2.string().optional(),
  maxTimeoutSeconds: z2.number().int().positive(),
  maxAmountRequired: z2.string().regex(/^[0-9]+$/, "amount must be provided in stroops"),
  payTo: z2.string().length(56),
  asset: z2.string(),
  extra: z2.object({
    networkPassphrase: z2.string(),
    feeSponsor: z2.string().length(56),
    sep10Domain: z2.string().url().optional(),
    contractId: z2.string().optional()
  }).passthrough()
});
var paymentHeaderSchema = z2.object({
  x402Version: z2.literal(1),
  scheme: z2.literal("exact"),
  network: z2.string(),
  payload: z2.object({
    transactionXdr: z2.string(),
    networkPassphrase: z2.string(),
    signatures: z2.array(z2.string()).optional(),
    metadata: z2.object({
      memo: z2.string().optional(),
      preparedAt: z2.string().optional()
    }).optional()
  })
});

// src/verify.ts
import { Horizon as Horizon2 } from "stellar-sdk";

// src/stellar.ts
import * as StellarSdk from "stellar-sdk";
import StellarSoroban from "@stellar/stellar-sdk";
var { SorobanRpc } = StellarSoroban;
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
    const { NotFoundError } = Horizon2;
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
import express from "express";
import pinoHttp from "pino-http";
import { config as loadEnv } from "dotenv";

// src/logger.ts
import pino from "pino";
var createLogger = () => pino({
  name: "stellar-x402-facilitator",
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.env.NODE_ENV === "production" ? void 0 : { target: "pino-pretty", options: { colorize: true } }
});

// src/server.ts
loadEnv();
var logger = createLogger();
var createApp = () => {
  const config = loadConfig(process.env);
  const verifier = createVerifier({ config });
  const settlement = createSettlement({ config });
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger }));
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
export {
  createApp,
  createSettlement,
  createVerifier,
  loadConfig,
  paymentHeaderSchema,
  paymentRequirementsSchema
};
