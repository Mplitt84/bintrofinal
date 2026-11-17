import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.middleware";
import { deleteClient, listProfiles, renameClient, saveProfile } from "./client-profiles.server.js";

const Name = z.string().trim().min(1).max(80);

export const getClientProfiles = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async () => ({ profiles: await listProfiles() }));

export const saveClientProfile = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      name: Name,
      phone: z.string().max(40),
      email: z.string().max(120),
      birthday: z.union([z.string().regex(/^\d{2}-\d{2}$/), z.literal("")]),
      sensitivities: z.string().max(1000),
      preferences: z.string().max(1000),
      notes: z.string().max(2000),
      rebookDays: z.number().int().min(0).max(365),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, ...(await saveProfile(data)) };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn’t save that." };
    }
  });

export const renameClientFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ from: Name, to: Name }))
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, ...(await renameClient(data.from, data.to)) };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn’t rename that client." };
    }
  });

export const deleteClientFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ name: Name }))
  .handler(async ({ data }) => deleteClient(data.name));
