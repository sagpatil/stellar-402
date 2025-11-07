"use strict";
/**
 * Transaction building and submission
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPaymentTransaction = buildPaymentTransaction;
exports.submitTransaction = submitTransaction;
exports.waitForConfirmation = waitForConfirmation;
exports.getTransactionDetails = getTransactionDetails;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const utils_1 = require("./utils");
const config_1 = require("./config");
/**
 * Build a USDC payment transaction
 */
async function buildPaymentTransaction(params) {
    const { sourceAddress, destinationAddress, amount, memo, network } = params;
    const server = (0, utils_1.getHorizonServer)(network);
    const config = (0, config_1.getNetworkConfig)(network);
    const usdcAsset = (0, utils_1.getUSDCAsset)(network);
    // Load source account
    const sourceAccount = await server.loadAccount(sourceAddress);
    // Build transaction with higher fee for testnet reliability
    const transactionBuilder = new stellar_sdk_1.TransactionBuilder(sourceAccount, {
        fee: (parseInt(stellar_sdk_1.BASE_FEE) * 10).toString(), // 10x base fee for testnet
        networkPassphrase: config.networkPassphrase,
    });
    // Add payment operation
    transactionBuilder.addOperation(stellar_sdk_1.Operation.payment({
        destination: destinationAddress,
        asset: usdcAsset,
        amount: parseFloat(amount).toFixed(7), // Stellar supports 7 decimal places
    }));
    // Add memo if provided
    if (memo) {
        transactionBuilder.addMemo(stellar_sdk_1.Memo.text(memo));
    }
    // Set timeout to 30 seconds
    transactionBuilder.setTimeout(30);
    // Build the transaction
    const transaction = transactionBuilder.build();
    return {
        transaction,
        xdr: transaction.toXDR(),
    };
}
/**
 * Submit a signed transaction to the network
 */
async function submitTransaction(signedXdr, network) {
    const server = (0, utils_1.getHorizonServer)(network);
    const transaction = stellar_sdk_1.TransactionBuilder.fromXDR(signedXdr, (0, config_1.getNetworkConfig)(network).networkPassphrase);
    const result = await server.submitTransaction(transaction);
    return {
        hash: result.hash,
        successful: result.successful,
        ledger: result.ledger,
    };
}
/**
 * Wait for transaction confirmation
 */
async function waitForConfirmation(txHash, network, maxAttempts = 30, delayMs = 1000) {
    const server = (0, utils_1.getHorizonServer)(network);
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const transaction = await server.transactions().transaction(txHash).call();
            return transaction.successful;
        }
        catch (error) {
            // Transaction not found yet, wait and retry
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    return false;
}
/**
 * Get transaction details
 */
async function getTransactionDetails(txHash, network) {
    const server = (0, utils_1.getHorizonServer)(network);
    return await server.transactions().transaction(txHash).call();
}
