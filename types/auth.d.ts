declare module '#auth-utils' {
  interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    permissions?: string[];
  }
}

export {}
