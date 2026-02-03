"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Link from "next/link";
import type { User } from "@repo/database/schema";

interface UserTableProps {
  users: User[];
}

export function UserTable({ users: initialUsers }: UserTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users] = useState(initialUsers);

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search users..."
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
              <th className="h-12 px-4 text-left align-middle font-medium">Email</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Role</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Verified</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Created</th>
              <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="p-4 align-middle">{user.name}</td>
                <td className="p-4 align-middle">{user.email}</td>
                <td className="p-4 align-middle">
                  <Badge variant={user.role === "site-admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </td>
                <td className="p-4 align-middle">
                  <Badge variant={user.emailVerified ? "default" : "outline"}>
                    {user.emailVerified ? "Yes" : "No"}
                  </Badge>
                </td>
                <td className="p-4 align-middle">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 align-middle">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/adminx/users/${user.id}`}>View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No users found</div>
        )}
      </div>
    </div>
  );
}

