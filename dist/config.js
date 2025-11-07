"use strict";
/**
 * Network configurations for Stellar
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NETWORK_CONFIGS = void 0;
exports.getNetworkConfig = getNetworkConfig;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
exports.NETWORK_CONFIGS = {
    mainnet: {
        horizonUrl: 'https://horizon.stellar.org',
        networkPassphrase: stellar_sdk_1.Networks.PUBLIC,
        usdc: {
            code: 'USDC',
            issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
        },
    },
    testnet: {
        horizonUrl: 'https://horizon-testnet.stellar.org',
        networkPassphrase: stellar_sdk_1.Networks.TESTNET,
        usdc: {
            code: 'USDC',
            issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        },
    },
};
function getNetworkConfig(network) {
    return exports.NETWORK_CONFIGS[network];
}
