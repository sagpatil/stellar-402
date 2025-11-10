// src/config.ts
import { Networks } from "@stellar/stellar-sdk";
var NETWORK_CONFIGS = {
  mainnet: {
    horizonUrl: "https://horizon.stellar.org",
    networkPassphrase: Networks.PUBLIC,
    usdc: {
      code: "USDC",
      issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
    }
  },
  testnet: {
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: Networks.TESTNET,
    usdc: {
      code: "USDC",
      issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
    }
  }
};
function getNetworkConfig(network) {
  return NETWORK_CONFIGS[network];
}

// src/utils.ts
import { Asset, Horizon } from "@stellar/stellar-sdk";
function getHorizonServer(network) {
  const config = getNetworkConfig(network);
  return new Horizon.Server(config.horizonUrl);
}
function getUSDCAsset(network) {
  const config = getNetworkConfig(network);
  return new Asset(config.usdc.code, config.usdc.issuer);
}
function isValidStellarAddress(address) {
  return /^G[A-Z0-9]{55}$/.test(address);
}
function formatAmount(amount) {
  const num = Number.parseFloat(amount);
  if (Number.isNaN(num)) {
    return "0.00";
  }
  return num.toFixed(2);
}

// src/balance.ts
async function getUSDCBalance(address, network) {
  try {
    const server = getHorizonServer(network);
    const config = getNetworkConfig(network);
    const account = await server.loadAccount(address);
    const usdcBalance = account.balances.find((balance) => {
      if (balance.asset_type === "native") {
        return false;
      }
      if (!("asset_code" in balance) || !("asset_issuer" in balance)) {
        return false;
      }
      return balance.asset_code === config.usdc.code && balance.asset_issuer === config.usdc.issuer;
    });
    if (usdcBalance && "balance" in usdcBalance) {
      return {
        balance: usdcBalance.balance,
        hasTrustline: true
      };
    }
    return {
      balance: "0",
      hasTrustline: false
    };
  } catch (error) {
    return {
      balance: "0",
      hasTrustline: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function hasUSDCTrustline(address, network) {
  const result = await getUSDCBalance(address, network);
  return result.hasTrustline;
}

// src/transaction.ts
import {
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Memo
} from "@stellar/stellar-sdk";
async function buildPaymentTransaction(params) {
  const { sourceAddress, destinationAddress, amount, memo, network } = params;
  const server = getHorizonServer(network);
  const config = getNetworkConfig(network);
  const usdcAsset = getUSDCAsset(network);
  const sourceAccount = await server.loadAccount(sourceAddress);
  const transactionBuilder = new TransactionBuilder(sourceAccount, {
    fee: (Number.parseInt(BASE_FEE) * 10).toString(),
    networkPassphrase: config.networkPassphrase
  });
  transactionBuilder.addOperation(
    Operation.payment({
      destination: destinationAddress,
      asset: usdcAsset,
      amount: Number.parseFloat(amount).toFixed(7)
    })
  );
  if (memo) {
    transactionBuilder.addMemo(Memo.text(memo));
  }
  transactionBuilder.setTimeout(30);
  const transaction = transactionBuilder.build();
  return {
    transaction,
    xdr: transaction.toXDR()
  };
}
async function submitTransaction(signedXdr, network) {
  const server = getHorizonServer(network);
  const transaction = TransactionBuilder.fromXDR(
    signedXdr,
    getNetworkConfig(network).networkPassphrase
  );
  const result = await server.submitTransaction(transaction);
  return {
    hash: result.hash,
    successful: result.successful,
    ledger: result.ledger
  };
}
async function waitForConfirmation(txHash, network, maxAttempts = 30, delayMs = 1e3) {
  const server = getHorizonServer(network);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const transaction = await server.transactions().transaction(txHash).call();
      return transaction.successful;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}
async function getTransactionDetails(txHash, network) {
  const server = getHorizonServer(network);
  return server.transactions().transaction(txHash).call();
}

// src/x402.ts
var X402_VERSION = 1;
var SUPPORTED_SCHEME = "exact";
function createStellarPaymentPayload(params) {
  const {
    requirement,
    signedTransactionXdr,
    networkPassphrase,
    signatures,
    memo,
    x402Version = X402_VERSION,
    metadata
  } = params;
  validateRequirement(requirement);
  validateSignedTransactionPayload({
    transactionXdr: signedTransactionXdr,
    networkPassphrase,
    signatures,
    metadata: {
      memo,
      preparedAt: metadata?.preparedAt
    }
  });
  if (x402Version !== X402_VERSION) {
    throw new Error(`Unsupported x402 version: ${x402Version}`);
  }
  return {
    x402Version: X402_VERSION,
    scheme: SUPPORTED_SCHEME,
    network: requirement.network,
    payload: {
      transactionXdr: signedTransactionXdr,
      networkPassphrase,
      signatures,
      metadata: {
        memo,
        preparedAt: metadata?.preparedAt
      }
    }
  };
}
function encodeStellarPaymentHeader(payload) {
  validatePayload(payload);
  return encodeBase64(JSON.stringify(payload));
}
function decodeStellarPaymentHeader(header) {
  if (!header || typeof header !== "string") {
    throw new Error("Invalid X-PAYMENT header value");
  }
  const decoded = decodeBase64(header);
  let data;
  try {
    data = JSON.parse(decoded);
  } catch {
    throw new Error("X-PAYMENT header is not valid JSON");
  }
  if (!isStellarPaymentPayload(data)) {
    throw new Error("X-PAYMENT payload is not a valid Stellar payload");
  }
  return data;
}
function validateRequirement(requirement) {
  if (requirement.scheme !== SUPPORTED_SCHEME) {
    throw new Error(`Unsupported scheme: ${requirement.scheme}`);
  }
  if (!isSupportedNetwork(requirement.network)) {
    throw new Error(`Unsupported network: ${requirement.network}`);
  }
  if (!/^G[A-Z0-9]{55}$/.test(requirement.payTo)) {
    throw new Error("payTo must be a valid Stellar public key");
  }
  if (!/^[0-9]+$/.test(requirement.maxAmountRequired)) {
    throw new Error("maxAmountRequired must be an integer string (stroops)");
  }
  if (requirement.maxTimeoutSeconds <= 0) {
    throw new Error("maxTimeoutSeconds must be greater than zero");
  }
}
function validatePayload(payload) {
  if (payload.x402Version !== X402_VERSION) {
    throw new Error(`Unsupported x402 version: ${payload.x402Version}`);
  }
  if (payload.scheme !== SUPPORTED_SCHEME) {
    throw new Error(`Unsupported scheme: ${payload.scheme}`);
  }
  if (!isSupportedNetwork(payload.network)) {
    throw new Error(`Unsupported network: ${payload.network}`);
  }
  validateSignedTransactionPayload(payload.payload);
}
function describeRequirement(requirement) {
  const amountInXlm = (Number(requirement.maxAmountRequired) / 1e7).toString();
  return `${formatAmount(amountInXlm)} ${requirement.asset} \u2192 ${requirement.payTo}`;
}
function isSupportedNetwork(network) {
  return network === "stellar-testnet" || network === "stellar-mainnet";
}
function validateSignedTransactionPayload(payload) {
  if (!payload.transactionXdr || typeof payload.transactionXdr !== "string") {
    throw new Error("transactionXdr must be provided");
  }
  if (!payload.networkPassphrase || typeof payload.networkPassphrase !== "string") {
    throw new Error("networkPassphrase must be provided");
  }
  if (payload.metadata?.memo && payload.metadata.memo.length > 28) {
    throw new Error("memo must be <= 28 characters");
  }
}
function isStellarPaymentPayload(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  if (candidate.x402Version !== X402_VERSION || candidate.scheme !== SUPPORTED_SCHEME || !candidate.network || typeof candidate.payload !== "object" || candidate.payload === null) {
    return false;
  }
  try {
    validatePayload(candidate);
    return true;
  } catch {
    return false;
  }
}
function encodeBase64(text) {
  if (typeof globalThis !== "undefined" && typeof globalThis.Buffer !== "undefined") {
    return globalThis.Buffer.from(text, "utf8").toString("base64");
  }
  if (typeof btoa === "function") {
    return btoa(text);
  }
  throw new Error("Base64 encoding not supported in this environment");
}
function decodeBase64(base64) {
  if (typeof globalThis !== "undefined" && typeof globalThis.Buffer !== "undefined") {
    return globalThis.Buffer.from(base64, "base64").toString("utf8");
  }
  if (typeof atob === "function") {
    return atob(base64);
  }
  throw new Error("Base64 decoding not supported in this environment");
}
export {
  NETWORK_CONFIGS,
  buildPaymentTransaction,
  createStellarPaymentPayload,
  decodeStellarPaymentHeader,
  describeRequirement,
  encodeStellarPaymentHeader,
  formatAmount,
  getHorizonServer,
  getNetworkConfig,
  getTransactionDetails,
  getUSDCAsset,
  getUSDCBalance,
  hasUSDCTrustline,
  isValidStellarAddress,
  submitTransaction,
  validatePayload,
  validateRequirement,
  waitForConfirmation
};
