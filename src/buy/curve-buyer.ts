import { parseEther, type Address, type Hash, type PublicClient, type WalletClient } from "viem";

import { robinhoodChain } from "../chain/robinhood.js";
import type { BuyConfig } from "../config/types.js";
import { NATIVE_PAIR_TOKEN, ponsCurveAbi } from "../contracts/pons.js";
import { getConfirmTimeMs } from "../detector/launch.js";
import type { PonsLaunch } from "../detector/types.js";
import { sleep } from "../lib/sleep.js";
import { Logger } from "../lib/logger.js";
import { buildTxGasParams } from "./gas.js";
import { applySlippage, quoteCurveBuy } from "./quote.js";
import { SnipeTaxGuard } from "./snipe-tax.js";
import { BuyOutcome } from "./types.js";

export class CurveBuyer {
  private readonly quoteIn: bigint;
  private readonly log: Logger;
  private readonly snipeTaxGuard: SnipeTaxGuard;

  constructor(
    private readonly publicClient: PublicClient,
    private readonly walletClient: WalletClient,
    private readonly walletAddress: Address,
    private readonly config: BuyConfig,
    logger: Logger,
  ) {
    this.quoteIn = parseEther(config.amountEth);
    this.log = logger.child("buy");
    this.snipeTaxGuard = new SnipeTaxGuard(
      publicClient,
      {
        maxSnipeTaxBps: config.maxSnipeTaxBps,
        pollIntervalMs: config.snipeTaxPollMs,
        maxWaitMs: config.snipeTaxMaxWaitMs,
      },
      logger,
    );
  }

  get address(): Address {
    return this.walletAddress;
  }

  async buyAfterDelay(launch: PonsLaunch): Promise<BuyOutcome> {
    const skipReason = this.getSkipReason(launch);
    if (skipReason) {
      this.log.warn(`skip ${launch.token}: ${skipReason}`);
      return BuyOutcome.Skipped;
    }

    const confirmMs = getConfirmTimeMs(launch)!;
    const targetMs = confirmMs + this.config.delayMs;
    const waitMs = Math.max(0, targetMs - Date.now());

    this.log.info(
      `waiting ${waitMs}ms before snipe-tax check token=${launch.token} curve=${launch.curve}`,
    );

    await sleep(waitMs);

    const taxResult = await this.snipeTaxGuard.waitUntilAcceptable(
      launch.curve,
      this.walletAddress,
    );

    if (!taxResult.ok) {
      this.log.warn(
        `skip ${launch.token}: snipe tax too high (${taxResult.snipeTaxBps} bps) after ${this.config.snipeTaxMaxWaitMs}ms`,
      );
      return BuyOutcome.Skipped;
    }

    let expectedOut: bigint;
    let minTokensOut: bigint;

    try {
      expectedOut = await quoteCurveBuy(
        this.publicClient,
        launch.curve,
        this.walletAddress,
        this.quoteIn,
      );
      minTokensOut = applySlippage(expectedOut, this.config.slippageBps);
    } catch (error) {
      this.log.error(`quote failed token=${launch.token}`, error);
      return BuyOutcome.Failed;
    }

    this.log.info(
      `buying token=${launch.token} amount=${this.config.amountEth} ETH expectedOut=${expectedOut} minOut=${minTokensOut} snipeTax=${taxResult.snipeTaxBps}bps slippage=${this.config.slippageBps}bps`,
    );

    return this.executeBuy(launch, minTokensOut);
  }

  private getSkipReason(launch: PonsLaunch): string | null {
    if (launch.blockTimestamp === null) {
      return "missing blockTimestamp";
    }

    if (launch.pairToken.toLowerCase() !== NATIVE_PAIR_TOKEN) {
      return "only native ETH pairs are supported";
    }

    return null;
  }

  private async executeBuy(launch: PonsLaunch, minTokensOut: bigint): Promise<BuyOutcome> {
    const startedAt = Date.now();
    const gas = buildTxGasParams(this.config);

    try {
      this.log.info(
        `submitting token=${launch.token} curve=${launch.curve} priorityFee=${this.config.priorityFeeGwei}gwei maxFee=${this.config.maxFeeGwei}gwei`,
      );

      const hash: Hash = await this.walletClient.writeContract({
        chain: robinhoodChain,
        account: this.walletAddress,
        address: launch.curve,
        abi: ponsCurveAbi,
        functionName: "buy",
        args: [this.quoteIn, minTokensOut, this.walletAddress],
        value: this.quoteIn,
        maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
        maxFeePerGas: gas.maxFeePerGas,
      });

      this.log.info(`submitted token=${launch.token} tx=${hash}`);

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      const elapsedMs = Date.now() - startedAt;

      if (receipt.status === "success") {
        this.log.info(
          `confirmed token=${launch.token} tx=${hash} elapsed=${elapsedMs}ms block=${receipt.blockNumber}`,
        );
        return BuyOutcome.Success;
      }

      this.log.error(`reverted token=${launch.token} tx=${hash} elapsed=${elapsedMs}ms`);
      return BuyOutcome.Failed;
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      this.log.error(`failed token=${launch.token} elapsed=${elapsedMs}ms`, error);
      return BuyOutcome.Failed;
    }
  }
}
