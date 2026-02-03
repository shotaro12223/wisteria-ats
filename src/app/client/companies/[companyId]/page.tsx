import { redirect } from "next/navigation";

export default async function CompanyClientRedirect(ctx: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await ctx.params;
  redirect(`/client/companies/${companyId}/dashboard`);
}
