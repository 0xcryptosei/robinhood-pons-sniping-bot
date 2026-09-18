import type { Address, PublicClient } from "viem";

import { ponsTokenAbi } from "../contracts/pons.js";
import { formatError } from "../lib/format-error.js";
import { Logger } from "../lib/logger.js";
import { sleep } from "../lib/sleep.js";
import type { TokenInfo, TokenSocials } from "./types.js";

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

export class TokenInfoFetcher {
  private readonly log: Logger;

  constructor(
    private readonly client: PublicClient,
    logger: Logger,
  ) {
    this.log = logger.child("token");
  }

  async fetch(token: Address): Promise<TokenInfo | null> {
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      const info = await this.fetchOnce(token);
      if (info) return info;

      if (attempt < RETRY_ATTEMPTS) {
        this.log.info(`retry ${attempt}/${RETRY_ATTEMPTS - 1} for ${token}`);
        await sleep(RETRY_DELAY_MS);
      }
    }

    return null;
  }

  private async fetchOnce(token: Address): Promise<TokenInfo | null> {
    try {
      const [name, symbol, decimals, onchainInfo] = await Promise.all([
        this.client.readContract({ address: token, abi: ponsTokenAbi, functionName: "name" }),
        this.client.readContract({ address: token, abi: ponsTokenAbi, functionName: "symbol" }),
        this.client.readContract({ address: token, abi: ponsTokenAbi, functionName: "decimals" }),
        this.client.readContract({ address: token, abi: ponsTokenAbi, functionName: "getTokenInfo" }),
      ]);

      const [, logo, description, socialsRaw] = onchainInfo;

      const socials: TokenSocials = {
        twitter: socialsRaw.twitter,
        telegram: socialsRaw.telegram,
        discord: socialsRaw.discord,
        website: socialsRaw.website,
        farcaster: socialsRaw.farcaster,
      };

      return { name, symbol, decimals, logo, description, socials };
    } catch (error) {
      this.log.warn(`fetch failed for ${token}: ${formatError(error)}`);
      return null;
    }
  }
}
