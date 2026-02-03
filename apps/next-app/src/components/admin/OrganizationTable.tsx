"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Link from "next/link";
import type { Organization } from "@repo/database/schema";

interface OrganizationTableProps {
  organizations: Organization[];
}

export function OrganizationTable({
  organizations: initialOrganizations,
}: OrganizationTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [organizations] = useState(initialOrganizations);

  const filteredOrganizations = organizations.filter(
    (org) =>
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Slug</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Created</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrganizations.map((org) => (
              <tr
                key={org.id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="p-4 align-middle">{org.name}</td>
                <td className="p-4 align-middle">{org.slug}</td>
                <td className="p-4 align-middle">
                  {new Date(org.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 align-middle">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/adminx/organizations/${org.id}`}>View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOrganizations.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No organizations found
          </div>
        )}
      </div>
    </div>
  );
}

