import { formatEther, type GetContractEventsReturnType } from "viem";

import { NATIVE_PAIR_TOKEN, ponsFactoryAbi } from "../contracts/pons.js";
import type { PonsLaunch } from "./types.js";

export type TokenLaunchedLog = GetContractEventsReturnType<
  typeof ponsFactoryAbi,
  "TokenLaunched"
>[number];

export function launchKey(launch: Pick<PonsLaunch, "transactionHash" | "logIndex">): string {
  return `${launch.transactionHash}:${launch.logIndex}`;
}

export function parseLaunchFromLog(log: TokenLaunchedLog): PonsLaunch | null {
  if (
    log.args.token === undefined ||
    log.args.curve === undefined ||
    log.args.deployer === undefined ||
    log.args.pairToken === undefined ||
    log.args.launchConfigId === undefined ||
    log.args.graduationThreshold === undefined ||
    log.blockNumber === null ||
    log.transactionHash === null ||
    log.logIndex === null
  ) {
    return null;
  }

  return {
    token: log.args.token,
    curve: log.args.curve,
    deployer: log.args.deployer,
    pairToken: log.args.pairToken,
    launchConfigId: log.args.launchConfigId,
    graduationThreshold: log.args.graduationThreshold,
    blockNumber: log.blockNumber,
    blockTimestamp: log.blockTimestamp ?? null,
    detectedAtMs: Date.now(),
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
  };
}

function isNativePair(pairToken: PonsLaunch["pairToken"]): boolean {
  return pairToken.toLowerCase() === NATIVE_PAIR_TOKEN;
}

export function getConfirmTimeMs(launch: PonsLaunch): number | null {
  if (launch.blockTimestamp === null) return null;
  return Number(launch.blockTimestamp) * 1000;
}

function getDetectionDelayMs(launch: PonsLaunch): number | null {
  const confirmMs = getConfirmTimeMs(launch);
  if (confirmMs === null) return null;
  return launch.detectedAtMs - confirmMs;
}

function formatPairToken(pairToken: PonsLaunch["pairToken"]): string {
  return isNativePair(pairToken) ? "ETH" : pairToken;
}

export function formatLaunch(launch: PonsLaunch): string {
  const confirmMs = getConfirmTimeMs(launch);
  const delayMs = getDetectionDelayMs(launch);

  const threshold = isNativePair(launch.pairToken)
    ? `${formatEther(launch.graduationThreshold)} ETH`
    : launch.graduationThreshold.toString();

  return [
    `confirmTime=${confirmMs ? new Date(confirmMs).toISOString() : "unknown"}`,
    `delay=${delayMs !== null ? `${delayMs}ms` : "unknown"}`,
    `block=${launch.blockNumber}`,
    `token=${launch.token}`,
    `curve=${launch.curve}`,
    `deployer=${launch.deployer}`,
    `pair=${formatPairToken(launch.pairToken)}`,
    `configId=${launch.launchConfigId}`,
    `graduationThreshold=${threshold}`,
    `tx=${launch.transactionHash}`,
  ].join(" | ");
}
