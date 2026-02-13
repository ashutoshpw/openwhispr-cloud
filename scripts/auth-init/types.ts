export const AUTH_PROVIDERS = [
  {
    value: "better-auth",
    name: "Better Auth (Recommended - simple, self-hosted, full-featured)",
    description: "Self-hosted auth with email/password, OAuth, organizations",
  },
  {
    value: "next-auth",
    name: "NextAuth (Auth.js v5 - widely used, flexible)",
    description: "Popular auth library with many OAuth providers",
  },
  {
    value: "clerk",
    name: "Clerk (Managed auth - hosted UI, user management)",
    description: "Fully managed auth with pre-built components",
  },
  {
    value: "authkit",
    name: "AuthKit (WorkOS - enterprise SSO, directory sync)",
    description: "Enterprise-grade auth with SSO and SCIM",
  },
] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number]["value"];

export interface LockFile {
  version: string;
  provider: AuthProvider;
  initializedAt: string;
  templateVersion: string;
  files: {
    copied: string[];
    removed: string[];
  };
  dependencies: {
    added: string[];
    removed: string[];
  };
}

export interface DependenciesConfig {
  [workspace: string]: {
    add?: Record<string, string>;
    remove?: string[];
    devDependencies?: {
      add?: Record<string, string>;
      remove?: string[];
    };
  };
}

export interface AuthInitPaths {
  rootDir: string;
  lockFilePath: string;
  backupDir: string;
  templatesDir: string;
  providerFoldersToRemove: string[];
}
