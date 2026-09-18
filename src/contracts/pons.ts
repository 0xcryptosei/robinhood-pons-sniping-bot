import { parseAbi, parseAbiItem } from "viem";

/** Pons V2 launch factory on Robinhood Chain (chain id 4663). */
export const PONS_V2_FACTORY = "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e" as const;

export const NATIVE_PAIR_TOKEN =
  "0x0000000000000000000000000000000000000000" as const;

export const ponsFactoryAbi = [
  parseAbiItem(
    "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)",
  ),
] as const;

export const ponsCurveAbi = parseAbi([
  "function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) payable returns (uint256 tokensOut)",
]);

export const ponsTokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function getTokenInfo() view returns (address tokenDeployer, string tokenLogo, string tokenDescription, (string twitter, string telegram, string discord, string website, string farcaster) tokenSocials)",
]);
