import { Suspense } from "react";
import ApplicantsPageClient from "./page.client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ApplicantsPageClient />
    </Suspense>
  );
}
