import { Suspense } from "react";
import JobsNewPageClient from "./page.client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <JobsNewPageClient />
    </Suspense>
  );
}
