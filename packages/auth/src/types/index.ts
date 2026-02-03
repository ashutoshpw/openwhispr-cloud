/**
 * @repo/auth - Shared types
 * Import via: import { UnifiedSession, ... } from "@repo/auth/types"
 */

export interface UnifiedUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role?: string | null;
  emailVerified?: boolean | null;
  createdAt?: Date | null;
}

export interface UnifiedSession {
  user: UnifiedUser;
  expiresAt: Date;
}

export interface AuthError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface SignInResult {
  data?: UnifiedSession | null;
  error?: AuthError;
}

export interface SignUpResult {
  data?: UnifiedSession | null;
  error?: AuthError;
}

export interface SignOutResult {
  error?: AuthError;
}

export interface RequestPasswordResetParams {
  email: string;
  redirectTo?: string;
}

export interface RequestPasswordResetResult {
  success?: boolean;
  error?: AuthError;
}

export interface ResetPasswordParams {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResult {
  success?: boolean;
  error?: AuthError;
}

export interface SignInSocialParams {
  provider: string;
  callbackURL?: string;
}

export interface GetSessionResult {
  data?: UnifiedSession | null;
  error?: AuthError;
}

export interface UseSessionResult {
  data: UnifiedSession | null;
  isLoading: boolean;
  error?: AuthError;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateOrganizationParams {
  name: string;
  slug: string;
}

export interface CreateOrganizationResult {
  data?: Organization;
  error?: AuthError;
}

export interface ListOrganizationsResult {
  data?: Organization[];
  error?: AuthError;
}

export interface SetActiveOrganizationParams {
  organizationId: string;
}

export interface SetActiveOrganizationResult {
  error?: AuthError;
}

export interface OrganizationAdapter {
  list(): Promise<ListOrganizationsResult>;
  create(params: CreateOrganizationParams): Promise<CreateOrganizationResult>;
  setActive(
    params: SetActiveOrganizationParams,
  ): Promise<SetActiveOrganizationResult>;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  organizationId: string;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateProjectParams {
  name: string;
  slug: string;
  description?: string;
  organizationId: string;
}

export interface CreateProjectResult {
  data?: Project;
  error?: AuthError;
}

export interface ListProjectsResult {
  data?: Project[];
  error?: AuthError;
}

export interface UpdateProjectParams {
  name?: string;
  slug?: string;
  description?: string;
}

export interface UpdateProjectResult {
  data?: Project;
  error?: AuthError;
}

export interface DeleteProjectResult {
  success?: boolean;
  error?: AuthError;
}

export interface AuthClientProvider {
  signInEmail(params: {
    email: string;
    password: string;
  }): Promise<SignInResult>;
  signUpEmail(params: {
    email: string;
    password: string;
    name: string;
  }): Promise<SignUpResult>;
  signOut(): Promise<SignOutResult>;
  getSession(): Promise<GetSessionResult>;
  useSession(): UseSessionResult;
  requestPasswordReset?(
    params: RequestPasswordResetParams,
  ): Promise<RequestPasswordResetResult>;
  resetPassword?(params: ResetPasswordParams): Promise<ResetPasswordResult>;
  getBaseClient?(): unknown;
}

export interface AuthServerProvider {
  getSession(headers: Headers): Promise<UnifiedSession | null>;
  getApiHandler(): {
    GET: (req: Request) => Promise<Response>;
    POST: (req: Request) => Promise<Response>;
  };
  getAuthInstance?(): unknown;
  signInEmail?(params: {
    email: string;
    password: string;
  }): Promise<SignInResult>;
  signUpEmail?(params: {
    email: string;
    password: string;
    name: string;
  }): Promise<SignUpResult>;
  signOut?(): Promise<SignOutResult>;
}
