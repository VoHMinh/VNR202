"use client";

import { useEffect, useState } from "react";
import { newId, useStory } from "@/game/session";
import { JoinForm } from "@/components/play/JoinForm";
import { PlayApp } from "@/components/play/PlayApp";

/**
 * Trang chơi. Vào bằng mã QR (/play?room=K7Q2) hoặc từ trang chủ.
 * Chưa có bí danh thì hiện giấy thông hành; đã có (tải lại trang) thì chơi tiếp đúng chỗ cũ.
 */
export default function PlayClient() {
  const [ready, setReady] = useState(false);
  const [urlRoom, setUrlRoom] = useState("");
  const [focusRoom, setFocusRoom] = useState(false);
  const [joined, setJoined] = useState(false);
  const start = useStory((s) => s.start);

  useEffect(() => {
    const go = () => {
      const p = new URLSearchParams(window.location.search);
      const r = (p.get("room") || "").trim().toUpperCase();
      const fresh = p.get("new") === "1";
      const s = useStory.getState().session;
      setUrlRoom(r);
      setFocusRoom(p.get("join") === "1");
      // Tiếp tục lượt đang chơi nếu cùng phòng (hoặc cùng chơi một mình).
      if (!fresh && s.name && (s.room ?? "") === r) setJoined(true);
      setReady(true);
    };
    if (useStory.persist.hasHydrated()) go();
    else return useStory.persist.onFinishHydration(go);
  }, []);

  // Vào lại phòng sau khi tải trang để server biết mình vẫn ở đây.
  useEffect(() => {
    if (!joined) return;
    const { session } = useStory.getState();
    if (!session.room) return;
    void fetch(`/api/rooms/${encodeURIComponent(session.room)}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: session.playerId, name: session.name }),
    }).catch(() => {});
  }, [joined]);

  if (!ready) return <main className="desk h-dvh" />;

  if (!joined) {
    return (
      <main className="desk relative h-dvh overflow-hidden">
        <JoinForm
          initialRoom={urlRoom}
          focusRoom={focusRoom}
          onJoin={async (name, room) => {
            const prev = useStory.getState().session;
            const playerId = prev.playerId && prev.room === room && prev.name === name ? prev.playerId : newId();
            if (room) {
              await fetch(`/api/rooms/${encodeURIComponent(room)}/join`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ playerId, name }),
              }).catch(() => null);
            }
            start({ name, room, playerId });
            window.history.replaceState(null, "", room ? `/play?room=${room}` : "/play");
            setJoined(true);
          }}
        />
      </main>
    );
  }

  return <PlayApp />;
}
