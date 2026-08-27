import { z } from "zod";

import type { components } from "../../../shared/api/generated/schema";

export type AuthResponse = components["schemas"]["AuthResponse"];
export type CsrfResponse = components["schemas"]["CsrfResponse"];
export type MeResponse = components["schemas"]["MeResponse"];
export type StatusResponse = components["schemas"]["StatusResponse"];

type LoginRequest = components["schemas"]["LoginRequest"];
type RegisterRequest = components["schemas"]["RegisterRequest"];
type ForgotPasswordRequest = components["schemas"]["ForgotPasswordRequest"];
type ResetPasswordRequest = components["schemas"]["ResetPasswordRequest"];

const emailSchema = z
  .string()
  .trim()
  .min(1, "请输入邮箱")
  .max(320, "邮箱不能超过 320 个字符")
  .email("请输入有效邮箱");

const loginPasswordSchema = z
  .string()
  .min(1, "请输入密码")
  .max(128, "密码不能超过 128 个字符");

const strongPasswordSchema = z
  .string()
  .min(12, "密码至少需要 12 个字符")
  .max(128, "密码不能超过 128 个字符");

const displayNameSchema = z
  .string()
  .trim()
  .min(1, "请输入昵称")
  .max(120, "昵称不能超过 120 个字符")
  .refine(
    (value) => ![...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127;
    }),
    "昵称包含不支持的字符",
  );

const resetTokenSchema = z
  .string()
  .min(32, "重置链接无效或已过期")
  .max(512, "重置链接无效或已过期")
  .refine((value) => value === value.trim(), "重置链接无效或已过期");

export const loginSchema: z.ZodType<LoginRequest, LoginRequest> = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
}).strict();

export const registerSchema: z.ZodType<RegisterRequest, RegisterRequest> = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
}).strict();

export const forgotPasswordSchema: z.ZodType<ForgotPasswordRequest, ForgotPasswordRequest> = z.object({
  email: emailSchema,
}).strict();

export const resetPasswordSchema: z.ZodType<ResetPasswordRequest, ResetPasswordRequest> = z.object({
  password: strongPasswordSchema,
  token: resetTokenSchema,
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
