/**
 * @repo/auth - Shared types for Better Auth
 */

export interface UnifiedUser {
  id: string;
  tenantId?: string | null;
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
  twoFactorRedirect?: boolean;
  twoFactorMethods?: string[];
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
