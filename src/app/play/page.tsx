import type { Metadata } from "next";
import PlayClient from "./PlayClient";

export const metadata: Metadata = { title: "Chơi · Mạch Ngầm" };

export default function PlayPage() {
  return <PlayClient />;
}
