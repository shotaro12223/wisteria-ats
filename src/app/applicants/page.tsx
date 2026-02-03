import { Suspense } from "react";
import ApplicantsPageClient from "./page.client";

export default function ApplicantsPage() {
  return (
    <Suspense>
      <ApplicantsPageClient />
    </Suspense>
  );
}
