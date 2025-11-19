import { OrganizationTable } from "@/components/admin/OrganizationTable";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";

async function getOrganizations() {
  try {
    const organizations = await db()
      .select()
      .from(organization)
      .orderBy(organization.createdAt);
    return organizations;
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return [];
  }
}

export default async function OrganizationsPage() {
  const organizations = await getOrganizations();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Organization Management</h1>
        <p className="text-muted-foreground">
          View and manage all organizations
        </p>
      </div>
      <OrganizationTable organizations={organizations} />
    </div>
  );
}

