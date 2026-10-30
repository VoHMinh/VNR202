"use client";

import { useParams } from "next/navigation";
import { HostRoom } from "@/components/host/HostRoom";

/** Màn chiếu chỉ xem (không có nút điều khiển), dùng khi mở bảng xếp hạng trên một máy khác. */
export default function BoardClient() {
  const { code } = useParams<{ code: string }>();
  return <HostRoom code={code.toUpperCase()} readOnly />;
}
