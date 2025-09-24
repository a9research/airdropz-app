export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  session: {
    token: string;
    expires: string;
  };
}

export interface SessionData {
  token: string;
  refreshToken?: string;
  expires: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
  cf_turnstile_token?: string;
  [key: string]: string | undefined;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  cf_turnstile_token?: string;
  referral_code?: string;
  activation_code?: string;
  [key: string]: string | undefined;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
