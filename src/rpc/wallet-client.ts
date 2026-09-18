import { createWalletClient, http, type Address, type Hex, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { robinhoodChain } from "../chain/robinhood.js";

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
