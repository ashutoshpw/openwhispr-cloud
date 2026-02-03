import { UserTable } from "@/components/admin/UserTable";
import { db } from "@repo/database";
import { user } from "@repo/database/schema";

async function getUsers() {
  try {
    const users = await db().select().from(user).orderBy(user.createdAt);
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          View and manage all registered users
        </p>
      </div>
      <UserTable users={users} />
    </div>
  );
}

