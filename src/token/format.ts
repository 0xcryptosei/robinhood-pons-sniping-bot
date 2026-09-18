import type { Address } from "viem";

import type { TokenInfo } from "./types.js";

export function formatTokenInfo(token: Address, info: TokenInfo): string {
  const socials = [
    info.socials.twitter && `twitter=${info.socials.twitter}`,
    info.socials.telegram && `telegram=${info.socials.telegram}`,
    info.socials.website && `website=${info.socials.website}`,
  ]
    .filter(Boolean)
    .join(" | ");

  return [
    `token=${token}`,
    `name=${info.name}`,
    `symbol=${info.symbol}`,
    `decimals=${info.decimals}`,
    info.logo && `logo=${info.logo}`,
    info.description && `description=${info.description.slice(0, 120)}`,
    socials,
  ]
    .filter(Boolean)
    .join(" | ");
}
