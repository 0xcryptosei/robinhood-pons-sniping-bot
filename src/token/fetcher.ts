import type { Address, PublicClient } from "viem";

import { ponsTokenAbi } from "../contracts/pons.js";
import { Logger } from "../lib/logger.js";
import type { TokenInfo, TokenSocials } from "./types.js";

export class TokenInfoFetcher {
  private readonly log: Logger;

  constructor(
    private readonly client: PublicClient,
    logger: Logger,
  ) {
    this.log = logger.child("token");
  }

  async fetch(token: Address): Promise<TokenInfo | null> {
    try {
      const [name, symbol, decimals, onchainInfo] = await Promise.all([
        this.client.readContract({
          address: token,
          abi: ponsTokenAbi,
          functionName: "name",
        }),
        this.client.readContract({
          address: token,
          abi: ponsTokenAbi,
          functionName: "symbol",
        }),
        this.client.readContract({
          address: token,
          abi: ponsTokenAbi,
          functionName: "decimals",
        }),
        this.client.readContract({
          address: token,
          abi: ponsTokenAbi,
          functionName: "getTokenInfo",
        }),
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
      this.log.warn(`failed to fetch info for ${token}: ${this.formatError(error)}`);
      return null;
    }
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}
