"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_middleware_resource_stellar = require("@stellar-x402/middleware-resource-stellar");
var app = (0, import_express.default)();
app.use(
  (0, import_cors.default)({
    origin: process.env.CORS_ORIGIN?.split(",").map((value) => value.trim()).filter(Boolean) ?? "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-PAYMENT"],
    exposedHeaders: ["X-PAYMENT-RESPONSE"]
  })
);
app.use(import_express.default.json());
var PORT = Number(process.env.PORT ?? 4022);
var FACILITATOR_URL = process.env.FACILITATOR_URL ?? "http://localhost:4021";
app.use(
  (0, import_middleware_resource_stellar.createStellarPaymentMiddleware)({
    requirementProvider,
    facilitator: {
      verifyUrl: `${FACILITATOR_URL}/verify`,
      settleUrl: `${FACILITATOR_URL}/settle`
    },
    logger: console
  })
);
app.get("/weather/premium", (_req, res) => {
  res.json({
    temperature: "72\xB0F",
    conditions: "Partly Cloudy",
    humidity: "65%",
    uvIndex: 6
  });
});
app.listen(PORT, () => {
  console.log(`Resource server listening on http://localhost:${PORT}`);
});
function requirementProvider(_req) {
  return {
    scheme: "exact",
    network: "stellar-testnet",
    resource: "https://api.example.com/weather/premium",
    description: "Premium weather data",
    mimeType: "application/json",
    maxTimeoutSeconds: 300,
    maxAmountRequired: process.env.MAX_AMOUNT_STROOPS ?? "5000000",
    payTo: process.env.PAY_TO ?? "GCFXT2DMSGL2H4EIIBQSHE7YPXC74FQOQSLX6HALYZ2VLZVXUV2J7BXD",
    asset: process.env.ASSET ?? "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    extra: {
      networkPassphrase: process.env.NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
      memoHint: process.env.MEMO_HINT ?? "x402-demo-payment",
      feeSponsor: process.env.FEE_SPONSOR ?? "GDWW2EP44SZS2TALXKIP4B3IDAFB7JSINECCAKVMRZFORLGERPQCHYFB"
    }
  };
}
