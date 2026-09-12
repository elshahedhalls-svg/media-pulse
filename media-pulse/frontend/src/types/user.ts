export type UserRole = "admin" | "analyst" | "viewer";

export interface User {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  allowed_features?: string[];
  allowed_platforms?: string[];
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserCreate {
  username: string;
  password: string;
  role: UserRole;
  allowed_features?: string[];
  allowed_platforms?: string[];
}
