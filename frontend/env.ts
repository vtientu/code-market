import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url("API_URL phải là URL hợp lệ."),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

const mergeSchema = clientSchema.safeExtend(serverSchema.shape);
const paredEnv = mergeSchema.safeParse(processEnv);

if (!paredEnv.success) {
  console.error(
    "❌ Biến môi trường không hợp lệ:",
    z.treeifyError(paredEnv.error),
  );
  throw new Error("Dừng chương trình do thiếu biến môi trường quan trọng.");
}

export const env = paredEnv.data;
