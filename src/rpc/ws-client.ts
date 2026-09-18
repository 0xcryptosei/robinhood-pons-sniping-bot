import { createPublicClient, webSocket, type PublicClient } from "viem";

import { robinhoodChain } from "../chain/robinhood.js";

const WSS_RECONNECT = {
  retryCount: 10,
  retryDelayMs: 1_000,
} as const;

export function createWsClient(wssUrl: string): PublicClient {
  return createPublicClient({
    chain: robinhoodChain,
    transport: webSocket(wssUrl, {
      reconnect: true,
      retryCount: WSS_RECONNECT.retryCount,
      retryDelay: WSS_RECONNECT.retryDelayMs,
    }),
  });
}
