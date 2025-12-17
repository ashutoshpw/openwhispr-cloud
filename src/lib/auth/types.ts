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
  details?: Record<string, any>;
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
  setActive(params: SetActiveOrganizationParams): Promise<SetActiveOrganizationResult>;
}

export interface AuthClientProvider {
  signInEmail(params: { email: string; password: string }): Promise<SignInResult>;
  signUpEmail(params: { email: string; password: string; name: string }): Promise<SignUpResult>;
  signOut(): Promise<SignOutResult>;
  getSession(): Promise<GetSessionResult>;
  useSession(): UseSessionResult;
  getBaseClient?(): any;
}

export interface AuthServerProvider {
  getSession(headers: Headers): Promise<UnifiedSession | null>;
  getApiHandler(): {
    GET: (req: Request) => Promise<Response>;
    POST: (req: Request) => Promise<Response>;
  };
  getAuthInstance?(): any;
  signInEmail?(params: { email: string; password: string }): Promise<SignInResult>;
  signUpEmail?(params: { email: string; password: string; name: string }): Promise<SignUpResult>;
  signOut?(): Promise<SignOutResult>;
}

