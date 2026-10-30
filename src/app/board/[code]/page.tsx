import type { Metadata } from "next";
import { Suspense } from "react";
import BoardClient from "./BoardClient";

export const metadata: Metadata = { title: "Bảng xếp hạng · Mạch Ngầm" };

export default function BoardPage() {
  return (
    <Suspense fallback={<main className="desk h-dvh" />}>
      <BoardClient />
    </Suspense>
  );
}
