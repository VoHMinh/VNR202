"use client";

import type { MiniGame } from "@/game/story";
import { Protect } from "@/components/mapgames/Protect";
import { Sneak } from "@/components/mapgames/Sneak";
import { Cipher } from "@/components/minigames/Cipher";
import { Door } from "@/components/minigames/Door";
import { Ink } from "@/components/minigames/Ink";
import { Interrogate } from "@/components/minigames/Interrogate";
import { Network } from "@/components/minigames/Network";
import { Print } from "@/components/minigames/Print";
import { Sort } from "@/components/minigames/Sort";
import { Spy } from "@/components/minigames/Spy";
import { Timeline } from "@/components/minigames/Timeline";
import type { MiniProps } from "@/components/minigames/types";

const GAMES: Record<MiniGame, (p: MiniProps) => React.ReactNode> = {
  print: Print,
  sort: Sort,
  protect: Protect,
  spy: Spy,
  sneak: Sneak,
  interrogate: Interrogate,
  timeline: Timeline,
  network: Network,
  ink: Ink,
  cipher: Cipher,
  door: Door,
};

/** Chọn trò chơi nhỏ theo nhiệm vụ. Mỗi trò tự tính giờ và gọi onFinish(điểm 0–1000) đúng một lần. */
export function MiniGameView({ game, ...props }: { game: MiniGame } & MiniProps) {
  const Game = GAMES[game];
  return <Game {...props} />;
}
