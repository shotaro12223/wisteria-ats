// src/app/applicants/inbox/[id]/page.tsx
import InboxDetailClient from "./InboxDetailClient";

export default async function InboxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const id = String(p?.id ?? "").trim();

  return <InboxDetailClient id={id} />;
}
