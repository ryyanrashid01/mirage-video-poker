# Mirage Video Poker

[![Deploy game to GitHub Pages](https://github.com/ryyanrashid01/mirage-video-poker/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ryyanrashid01/mirage-video-poker/actions/workflows/deploy-pages.yml)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=071511)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Bun](https://img.shields.io/badge/Bun-1.x-FBF0DF?logo=bun&logoColor=14151A)](https://bun.sh/)

A polished, free-play Jacks or Better game built with React and Vite. Mirage combines a classic deal–hold–draw loop with modern cards, responsive casino presentation, progression, missions, a double-or-nothing side game, and an optional Table Guide.

## Highlights

- Complete Jacks or Better hand evaluation and bet-sensitive paytable
- Table Guide that compares all 32 hold choices
- Exact odds for one- and two-card draws, with deterministic simulation for larger draws
- Procedural card, chip, hold, win and jackpot sounds using the Web Audio API
- Player-selected starting bankroll with a $10,000 default, presets and a custom option
- Persistent free-play balance, XP, streaks and session statistics
- Responsive keyboard, touch and mobile controls
- Automated GitHub Pages deployment

## Run locally

```bash
bun install
bun run dev
```

Build and validate with:

```bash
bun run build
bun run lint
```

## Table Guide

Turn on **Guide** before or during a hand. After the deal, it evaluates every possible hold, highlights the recommended cards and explains:

- the best cards to keep;
- the chance of finishing with a paying hand;
- expected payout relative to the current bet; and
- likely outcomes such as a pair, straight, flush or full house.

The coach only uses the visible hand and all theoretically unseen cards. It never reads the order of the shuffled in-game deck.

## Disclaimer

Mirage uses virtual credits only and has no real-money wagering or purchases.
