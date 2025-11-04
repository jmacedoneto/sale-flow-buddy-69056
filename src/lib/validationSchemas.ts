import { z } from "zod";

/**
 * Schemas de validação reutilizáveis para formulários
 * Seguindo princípio DRY (Don't Repeat Yourself) e SSOT (Single Source of Truth)
 */

export const cardSchema = z.object({
  titulo: z.string()
    .trim()
    .min(1, "Título é obrigatório")
    .max(100, "Título deve ter no máximo 100 caracteres"),
  etapa_id: z.string().min(1, "Etapa é obrigatória"),
  resumo: z.string()
    .trim()
    .max(500, "Resumo deve ter no máximo 500 caracteres")
    .optional(),
  prazo: z.date().optional(),
  prioridade: z.string().optional(),
  data_retorno: z.date({ required_error: "Data de retorno é obrigatória" }),
});

export const funilSchema = z.object({
  nome: z.string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
});

export const etapaSchema = z.object({
  nome: z.string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  ordem: z.number().int().positive().optional(),
});

export const smtpConfigSchema = z.object({
  smtp_host: z.string().min(3, "Host é obrigatório"),
  smtp_port: z.number()
    .int()
    .min(1, "Porta deve ser maior que 0")
    .max(65535, "Porta deve ser menor que 65536")
    .refine(val => [25, 465, 587, 2525].includes(val), {
      message: "Use uma porta SMTP válida (25, 465, 587 ou 2525)"
    }),
  smtp_user: z.string().min(3, "Usuário é obrigatório"),
  from_email: z.string().email("Email inválido"),
  from_name: z.string().min(3, "Nome é obrigatório"),
});

export const inviteUserSchema = z.object({
  email: z.string().email("Email inválido"),
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  role: z.enum(['master', 'admin', 'manager', 'agent', 'viewer'], {
    errorMap: () => ({ message: "Selecione uma função válida" })
  }),
});

export type CardFormData = z.infer<typeof cardSchema>;
export type FunilFormData = z.infer<typeof funilSchema>;
export type EtapaFormData = z.infer<typeof etapaSchema>;
export type SmtpConfigFormData = z.infer<typeof smtpConfigSchema>;
export type InviteUserFormData = z.infer<typeof inviteUserSchema>;