import {
  createPublicClient,
  createWalletClient,
  http,
  webSocket,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

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

export function createHttpClient(httpUrl: string): PublicClient {
  return createPublicClient({
    chain: robinhoodChain,
    transport: http(httpUrl),
  });
}

export function createWalletClientFromKey(
  httpUrl: string,
  privateKey: Hex,
): { wallet: WalletClient; address: Address } {
  const account = privateKeyToAccount(privateKey);

  const wallet = createWalletClient({
    account,
    chain: robinhoodChain,
    transport: http(httpUrl),
  });

  return { wallet, address: account.address };
}
