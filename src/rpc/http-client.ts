import { createPublicClient, http, type PublicClient } from "viem";

import { robinhoodChain } from "../chain/robinhood.js";

export function createHttpClient(httpUrl: string): PublicClient {
  return createPublicClient({
    chain: robinhoodChain,
    transport: http(httpUrl),
  });
}

export function wssToHttpUrl(wssUrl: string): string {
  return wssUrl.replace(/^wss:\/\//i, "https://");
}
