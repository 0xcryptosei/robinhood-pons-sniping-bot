import type { Address, Hash } from "viem";

export type PonsLaunch = {
  token: Address;
  curve: Address;
  deployer: Address;
  pairToken: Address;
  launchConfigId: bigint;
  graduationThreshold: bigint;
  blockNumber: bigint;
  blockTimestamp: bigint | null;
  detectedAtMs: number;
  transactionHash: Hash;
  logIndex: number;
};
