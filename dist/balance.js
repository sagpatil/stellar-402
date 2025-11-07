"use strict";
/**
 * Balance fetching functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUSDCBalance = getUSDCBalance;
exports.hasUSDCTrustline = hasUSDCTrustline;
const utils_1 = require("./utils");
const config_1 = require("./config");
/**
 * Get USDC balance for a Stellar account
 */
async function getUSDCBalance(address, network) {
    try {
        const server = (0, utils_1.getHorizonServer)(network);
        const config = (0, config_1.getNetworkConfig)(network);
        // Load account from Stellar network
        const account = await server.loadAccount(address);
        // Find USDC balance
        const usdcBalance = account.balances.find((b) => b.asset_type !== 'native' &&
            'asset_code' in b &&
            'asset_issuer' in b &&
            b.asset_code === config.usdc.code &&
            b.asset_issuer === config.usdc.issuer);
        if (usdcBalance && 'balance' in usdcBalance) {
            return {
                balance: usdcBalance.balance,
                hasTrustline: true,
            };
        }
        // Account exists but no USDC trustline
        return {
            balance: '0',
            hasTrustline: false,
        };
    }
    catch (error) {
        // Account doesn't exist or other error
        return {
            balance: '0',
            hasTrustline: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Check if account has USDC trustline
 */
async function hasUSDCTrustline(address, network) {
    const result = await getUSDCBalance(address, network);
    return result.hasTrustline;
}
