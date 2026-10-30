"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** window.location.origin trên client, chuỗi rỗng khi render ở server (tránh lệch hydrate). */
export function useOrigin(): string {
  return useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );
}
