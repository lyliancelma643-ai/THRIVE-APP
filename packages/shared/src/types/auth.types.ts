export interface IAuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

export interface IAuthState {
  user: IAuthUser | null;
  session: IAuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
