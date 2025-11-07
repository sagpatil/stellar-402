"use strict";
/**
 * Basic utility functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHorizonServer = getHorizonServer;
exports.getUSDCAsset = getUSDCAsset;
exports.isValidStellarAddress = isValidStellarAddress;
exports.formatAmount = formatAmount;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const config_1 = require("./config");
/**
 * Get Horizon server for a network
 */
function getHorizonServer(network) {
    const config = (0, config_1.getNetworkConfig)(network);
    return new stellar_sdk_1.Horizon.Server(config.horizonUrl);
}
/**
 * Get USDC asset for a network
 */
function getUSDCAsset(network) {
    const config = (0, config_1.getNetworkConfig)(network);
    return new stellar_sdk_1.Asset(config.usdc.code, config.usdc.issuer);
}
/**
 * Validate Stellar address format
 */
function isValidStellarAddress(address) {
    return /^G[A-Z0-9]{55}$/.test(address);
}
/**
 * Format amount for display
 */
function formatAmount(amount) {
    const num = parseFloat(amount);
    if (isNaN(num))
        return '0.00';
    return num.toFixed(2);
}
