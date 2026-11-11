import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.middleware";
import { addPhoto, allFormulas, deleteFormula, getAftercareTemplate, listFormulas, listPhotos, removePhoto, saveFormula, setAftercareTemplate } from "./formulas.server.js";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const FormulaSchema = z.object({
  id: z.number().int().optional(),
  kind: z.enum(["hair", "tattoo"]),
  clientName: z.string().trim().min(1).max(80),
  serviceDate: date,
  service: z.string().max(120),
  lines: z.array(z.object({ item: z.string().max(80), amount: z.string().max(30) })).max(20),
  retail: z
    .array(z.object({ productId: z.number().int().nullable(), name: z.string().max(120), qty: z.number().int().min(0).max(99), sold: z.boolean(), logged: z.boolean().optional() }))
    .max(20),
  developer: z.string().max(60),
  ratio: z.string().max(20),
  processingMinutes: z.number().min(0).max(600),
  leftover: z.string().max(30),
  aftercare: z.string().max(3000),
  followUpOn: z.union([date, z.literal("")]),
  notes: z.string().max(2000),
  staffName: z.string().max(60),
});

export const getFormulas = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .inputValidator(z.object({ search: z.string().max(80) }))
  .handler(async ({ data }) => ({ formulas: await listFormulas(data.search), aftercareTemplate: await getAftercareTemplate() }));

export const exportFormulas = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async () => allFormulas());

export const saveClientFormula = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(FormulaSchema)
  .handler(async ({ data }) => saveFormula(data));

export const deleteClientFormula = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => deleteFormula(data.id));

export const saveAftercareTemplate = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ text: z.string().max(3000) }))
  .handler(async ({ data }) => setAftercareTemplate(data.text.trim()));

export const getFormulaPhotos = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .inputValidator(z.object({ formulaId: z.number().int() }))
  .handler(async ({ data }) => listPhotos(data.formulaId));

export const addFormulaPhoto = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ formulaId: z.number().int(), label: z.enum(["before", "after"]), data: z.string().max(5_500_000) }))
  .handler(async ({ data }) => addPhoto(data.formulaId, data.label, data.data));

export const deleteFormulaPhoto = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => removePhoto(data.id));
