"use client";

import { useParams } from "next/navigation";
import { HostRoom } from "@/components/host/HostRoom";

export default function HostRoomClient() {
  const { code } = useParams<{ code: string }>();
  return <HostRoom code={code.toUpperCase()} />;
}
