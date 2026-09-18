# Robinhood Pons Sniping Bot

Detect new **Pons V2** token launches on Robinhood Chain (chain id `4663`) via WebSocket, fetch token metadata, and buy on the bonding curve.

## Features

- Live `TokenLaunched` event subscription on the Pons V2 factory
- Detection delay logging (`confirmTime` vs detect time)
- Token metadata reads (`name`, `symbol`, `decimals`, `getTokenInfo()`)
- Bonding curve buy via `curve.buy()` (ETH pairs, configurable delay after confirm time)

## Quick start

```bash
npm install
cp .env.example .env
# edit .env with your ROBINHOOD_WSS_URL
npm start
```

## Environment

| Variable | Required | Description |
|---|---|---|
| `ROBINHOOD_WSS_URL` | yes | WebSocket RPC URL |
| `ROBINHOOD_RPC_URL` | no | HTTP RPC for token reads (defaults to WSS URL with `https://`) |
| `BACKFILL_BLOCKS` | no | Historical log backfill on startup (`0` = live only) |
| `BUY_ENABLED` | no | Enable auto-buy (`true` by default) |
| `PRIVATE_KEY` | if buy enabled | Wallet private key for buy txs |
| `BUY_AMOUNT_ETH` | no | ETH amount per buy (default `0.01`) |
| `BUY_DELAY_MS` | no | Wait after on-chain confirm before buy (default `2000`) |
| `BUY_RESUME_ON_FAILURE` | no | Resume detection after failed buy (default `false`) |

## Example output

![Detection and token info output](docs/screenshots/detection-output.png)

Sample log lines:

```text
[bot:launch] confirmTime=2026-09-18T08:48:42.000Z | delay=1186ms | block=66093971 | token=0xBe8A... | curve=0xAf88... | ...
[bot:token]  token=0xBe8A... | name=... | symbol=... | decimals=18 | logo=ipfs://...
```

> **Note:** Token metadata reads can fail immediately after launch if the contract is not fully initialized yet (`symbol()` / `decimals()` returning empty data). Detection still works; metadata may succeed on a retry in a later phase.

## Project structure

```
src/
├── bot/sniping-bot.ts
├── buy/               # Curve buy execution
├── detector/          # Launch event parsing + subscription
├── token/             # Token metadata fetch + format
├── contracts/         # Pons ABIs + addresses
├── rpc/               # WebSocket, HTTP, wallet clients
├── config/
├── chain/
└── lib/
```

## Scripts

```bash
npm start       # run detector
npm run detect  # alias for start
npm run typecheck
```
