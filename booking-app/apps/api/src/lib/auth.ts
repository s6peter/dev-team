import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Role, User } from "@prisma/client";

const secret = () => process.env.JWT_SECRET || "local-dev-secret";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(user: Pick<User, "id" | "email" | "role">) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, secret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): { sub: string; email: string; role: Role } {
  return jwt.verify(token, secret()) as { sub: string; email: string; role: Role };
}
