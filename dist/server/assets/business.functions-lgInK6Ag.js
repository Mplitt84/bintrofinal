import { r as requireUser } from "./auth.middleware-2uPScvPU.js";
import { c as createServerFn } from "../server.js";
import { z } from "zod";
import { f as findBusinessProfile, s as saveBusinessProfile, b as findTeamMembers, i as insertTeamMember, d as deleteTeamMember, c as findProductCategories, u as upsertProductCategories, e as deleteProductCategories, g as computeBudgetOverview, h as findExpensesForMonth, j as insertExpense, k as updateExpense, l as deleteExpense, m as setMonthBudget, a as findBusinessContext } from "./business.server-WsLDvovH.js";
import { s as suggestProductDetails, b as readReceipt } from "./product-lookup.server-C6LGgHTN.js";
import { integrationStatus, integrationErrorLog, disconnectIntegration, squareRetailCategories, saveSquareRetailCategories, sendAllCountsToSquare, syncSquareSales, pushMonthToQuickBooks, importSquareCatalog } from "./integrations.server-G7imLk5v.js";
import { T as TAX_GROUPS } from "./business-types-DKNVcfJE.js";
import { m as assertTeamRoom, d as assertFeature } from "./account.server-Dnxw0Aoe.js";
import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import "node:crypto";
import "drizzle-orm";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "./inventory.server-XXvTatuj.js";
import "./inventory-defaults-BnRHgx1T.js";
const MONTH = z.string().regex(/^\d{4}-\d{2}$/);
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const MonthWindowSchema = z.object({
  key: MONTH,
  start: z.string(),
  end: z.string()
});
const getBusinessProfile_createServerFn_handler = createServerRpc({
  id: "d970acd5d7af08a73c0ba47640fdc8328ef797f7c17c2c8f8e1b3374967e974f",
  name: "getBusinessProfile",
  filename: "src/server/business.functions.ts"
}, (opts) => getBusinessProfile.__executeServer(opts));
const getBusinessProfile = createServerFn({
  method: "GET"
}).middleware([requireUser]).handler(getBusinessProfile_createServerFn_handler, async () => {
  return findBusinessProfile();
});
const ProfileSchema = z.object({
  name: z.string().max(120).optional(),
  businessType: z.string().max(40).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(60).optional(),
  address: z.string().max(400).optional(),
  website: z.string().max(300).optional(),
  orderEmail: z.string().max(200).optional(),
  monthlyBudgetCents: z.number().int().min(0).max(1e9).optional(),
  weeklyReportEmail: z.boolean().optional(),
  monthlyReportEmail: z.boolean().optional(),
  fastMoverAlertEmail: z.boolean().optional(),
  palette: z.string().max(40).optional(),
  orderEveryDays: z.number().int().min(1).max(90).optional()
});
const updateBusinessProfile_createServerFn_handler = createServerRpc({
  id: "f58d1793ee2723bf0402eab4bd8f5a7dc554805eb2915147a259f18b58527477",
  name: "updateBusinessProfile",
  filename: "src/server/business.functions.ts"
}, (opts) => updateBusinessProfile.__executeServer(opts));
const updateBusinessProfile = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(ProfileSchema).handler(updateBusinessProfile_createServerFn_handler, async ({
  data
}) => {
  const trimmed = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
  return saveBusinessProfile(trimmed);
});
const listTeamMembers_createServerFn_handler = createServerRpc({
  id: "fae8e846587193e222a59fc22c1b526e3a4e748ce7615bc55c083b2922766d02",
  name: "listTeamMembers",
  filename: "src/server/business.functions.ts"
}, (opts) => listTeamMembers.__executeServer(opts));
const listTeamMembers = createServerFn({
  method: "GET"
}).middleware([requireUser]).handler(listTeamMembers_createServerFn_handler, async () => {
  return findTeamMembers();
});
const addTeamMember_createServerFn_handler = createServerRpc({
  id: "98e7a6e61ac171aec6645c9a7bce643b01f8d83c6ee3fd69c2e152c87fd47a16",
  name: "addTeamMember",
  filename: "src/server/business.functions.ts"
}, (opts) => addTeamMember.__executeServer(opts));
const addTeamMember = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  name: z.string().trim().min(1).max(60)
})).handler(addTeamMember_createServerFn_handler, async ({
  data
}) => {
  await assertTeamRoom();
  return insertTeamMember(data.name);
});
const removeTeamMember_createServerFn_handler = createServerRpc({
  id: "d8c3d79a53d1d22a9c01e5728ba1973940ce39c40e8db772763db1acb4541fa3",
  name: "removeTeamMember",
  filename: "src/server/business.functions.ts"
}, (opts) => removeTeamMember.__executeServer(opts));
const removeTeamMember = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  id: z.number().int()
})).handler(removeTeamMember_createServerFn_handler, async ({
  data
}) => {
  return deleteTeamMember(data.id);
});
const TaxGroupSchema = z.enum(TAX_GROUPS.map((g) => g.id));
const listProductCategories_createServerFn_handler = createServerRpc({
  id: "7ce8966b25cd7f0cfcd5b0b9291d73f2a93896642781b7129af2f7d4efe27a0b",
  name: "listProductCategories",
  filename: "src/server/business.functions.ts"
}, (opts) => listProductCategories.__executeServer(opts));
const listProductCategories = createServerFn({
  method: "GET"
}).middleware([requireUser]).handler(listProductCategories_createServerFn_handler, async () => {
  return findProductCategories();
});
const saveProductCategories_createServerFn_handler = createServerRpc({
  id: "79714bd1315f8ca197b45f48ebcb30c863035c6713c2eaebe0af06fbf3799920",
  name: "saveProductCategories",
  filename: "src/server/business.functions.ts"
}, (opts) => saveProductCategories.__executeServer(opts));
const saveProductCategories = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  items: z.array(z.object({
    name: z.string().trim().min(1).max(60),
    taxGroup: TaxGroupSchema
  })).max(100)
})).handler(saveProductCategories_createServerFn_handler, async ({
  data
}) => {
  return upsertProductCategories(data.items);
});
const removeProductCategories_createServerFn_handler = createServerRpc({
  id: "0cab1653405c989dbe1a925b0e1a6ca0a0f3152f416a3bb686cb270ded1ac2d1",
  name: "removeProductCategories",
  filename: "src/server/business.functions.ts"
}, (opts) => removeProductCategories.__executeServer(opts));
const removeProductCategories = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  ids: z.array(z.number().int()).max(200)
})).handler(removeProductCategories_createServerFn_handler, async ({
  data
}) => {
  return deleteProductCategories(data.ids);
});
const getBudgetOverview_createServerFn_handler = createServerRpc({
  id: "60c53bd292604ab49247ff833410708f26f67d1a410b06ea0fc1e42757d81427",
  name: "getBudgetOverview",
  filename: "src/server/business.functions.ts"
}, (opts) => getBudgetOverview.__executeServer(opts));
const getBudgetOverview = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  months: z.array(MonthWindowSchema).min(1).max(24)
})).handler(getBudgetOverview_createServerFn_handler, async ({
  data
}) => {
  return computeBudgetOverview(data.months);
});
const listExpenses_createServerFn_handler = createServerRpc({
  id: "8354b80e0ab29cbb323d00a85f10147647b566a9a1f39be7b061b767cd620249",
  name: "listExpenses",
  filename: "src/server/business.functions.ts"
}, (opts) => listExpenses.__executeServer(opts));
const listExpenses = createServerFn({
  method: "GET"
}).middleware([requireUser]).inputValidator(z.object({
  month: MONTH
})).handler(listExpenses_createServerFn_handler, async ({
  data
}) => {
  return findExpensesForMonth(data.month);
});
const ExpenseSchema = z.object({
  spentOn: DAY,
  amountCents: z.number().int().min(1).max(1e9),
  category: z.string().max(60).optional(),
  vendor: z.string().max(120).optional(),
  note: z.string().max(300).optional(),
  staffName: z.string().max(60).optional()
});
const createExpense_createServerFn_handler = createServerRpc({
  id: "49853aa174a5c462bef69456eecd66b5c7039e75c14d31a2cee30b492f4762b3",
  name: "createExpense",
  filename: "src/server/business.functions.ts"
}, (opts) => createExpense.__executeServer(opts));
const createExpense = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(ExpenseSchema).handler(createExpense_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("budget");
  return insertExpense(data);
});
const editExpense_createServerFn_handler = createServerRpc({
  id: "4b1d7b597eabf67b74428f099b57382fd027b27eb2c3e57e1cdd6f8ed9bbd37f",
  name: "editExpense",
  filename: "src/server/business.functions.ts"
}, (opts) => editExpense.__executeServer(opts));
const editExpense = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(ExpenseSchema.partial().extend({
  id: z.number().int()
})).handler(editExpense_createServerFn_handler, async ({
  data
}) => {
  const {
    id,
    ...rest
  } = data;
  return updateExpense(id, rest);
});
const removeExpense_createServerFn_handler = createServerRpc({
  id: "7ea615c7b8d6e00557d0d359a13f245370ea95ccc774d34cda10fcaa53ba1d50",
  name: "removeExpense",
  filename: "src/server/business.functions.ts"
}, (opts) => removeExpense.__executeServer(opts));
const removeExpense = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  id: z.number().int()
})).handler(removeExpense_createServerFn_handler, async ({
  data
}) => {
  await deleteExpense(data.id);
  return {
    ok: true
  };
});
const saveMonthBudget_createServerFn_handler = createServerRpc({
  id: "6067ddb4ac537c8fa1023b6006799e98d4516de28d608cb0a2d2d868ea54c330",
  name: "saveMonthBudget",
  filename: "src/server/business.functions.ts"
}, (opts) => saveMonthBudget.__executeServer(opts));
const saveMonthBudget = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  month: MONTH,
  amountCents: z.number().int().min(0).max(1e9).nullable()
})).handler(saveMonthBudget_createServerFn_handler, async ({
  data
}) => {
  await setMonthBudget(data.month, data.amountCents);
  return {
    ok: true
  };
});
const businessContext = findBusinessContext;
const suggestProduct_createServerFn_handler = createServerRpc({
  id: "e05fc2fa0ed66607af2fc2fccf41b61c3153608b3b0e488870282e4d9929064e",
  name: "suggestProduct",
  filename: "src/server/business.functions.ts"
}, (opts) => suggestProduct.__executeServer(opts));
const suggestProduct = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  brand: z.string().max(160),
  name: z.string().max(200),
  size: z.string().max(60),
  category: z.string().max(80),
  vendor: z.string().max(120)
})).handler(suggestProduct_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("ai");
  return suggestProductDetails(data, await businessContext());
});
const readReceiptPhoto_createServerFn_handler = createServerRpc({
  id: "a974410b51934831b8bced98077808c30b4018bf4410fda89228573e360ae3d9",
  name: "readReceiptPhoto",
  filename: "src/server/business.functions.ts"
}, (opts) => readReceiptPhoto.__executeServer(opts));
const readReceiptPhoto = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  image: z.string().min(1).max(6e6),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"])
})).handler(readReceiptPhoto_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("budget");
  const business = await businessContext();
  return readReceipt(data.image, data.mediaType, business.expenseCategories);
});
const getIntegrations_createServerFn_handler = createServerRpc({
  id: "b06120bf660a285feb8c23b17355192686a94b8f95623ceae33570d7526402b4",
  name: "getIntegrations",
  filename: "src/server/business.functions.ts"
}, (opts) => getIntegrations.__executeServer(opts));
const getIntegrations = createServerFn({
  method: "GET"
}).middleware([requireUser]).handler(getIntegrations_createServerFn_handler, async () => {
  return integrationStatus();
});
const ProviderSchema = z.object({
  provider: z.enum(["square", "quickbooks"])
});
const getIntegrationErrorLog_createServerFn_handler = createServerRpc({
  id: "b4d5d2e66b56601226f6243a8e4301b02f959e74f4f9ef33982245a3a359ce3e",
  name: "getIntegrationErrorLog",
  filename: "src/server/business.functions.ts"
}, (opts) => getIntegrationErrorLog.__executeServer(opts));
const getIntegrationErrorLog = createServerFn({
  method: "GET"
}).middleware([requireUser]).inputValidator(ProviderSchema).handler(getIntegrationErrorLog_createServerFn_handler, async ({
  data
}) => integrationErrorLog(data.provider));
const disconnect_createServerFn_handler = createServerRpc({
  id: "cee688b920afcb247e533bef8972f2caef04ad0aedf980b312a4aae716be36db",
  name: "disconnect",
  filename: "src/server/business.functions.ts"
}, (opts) => disconnect.__executeServer(opts));
const disconnect = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(ProviderSchema).handler(disconnect_createServerFn_handler, async ({
  data
}) => {
  await disconnectIntegration(data.provider);
  return integrationStatus();
});
async function attempt(fn) {
  try {
    return {
      ok: true,
      result: await fn()
    };
  } catch (error) {
    console.error("Integration error", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong."
    };
  }
}
const squareImportCatalog_createServerFn_handler = createServerRpc({
  id: "14a0f7ff335f0a1bc922563407a7e578abcdef957f4a28aac6db963311b18ba0",
  name: "squareImportCatalog",
  filename: "src/server/business.functions.ts"
}, (opts) => squareImportCatalog.__executeServer(opts));
const squareImportCatalog = createServerFn({
  method: "POST"
}).middleware([requireUser]).handler(squareImportCatalog_createServerFn_handler, async () => {
  return attempt(async () => {
    await assertFeature("square");
    return importSquareCatalog();
  });
});
const getSquareRetailCategories_createServerFn_handler = createServerRpc({
  id: "a85d992ef0dd5f80187a82d58000361d4951db8ac255a3fc40c2c2ad1ade692a",
  name: "getSquareRetailCategories",
  filename: "src/server/business.functions.ts"
}, (opts) => getSquareRetailCategories.__executeServer(opts));
const getSquareRetailCategories = createServerFn({
  method: "GET"
}).middleware([requireUser]).handler(getSquareRetailCategories_createServerFn_handler, async () => {
  return attempt(async () => {
    await assertFeature("square");
    return squareRetailCategories();
  });
});
const setSquareRetailCategories_createServerFn_handler = createServerRpc({
  id: "20d79206e108af8af93f7352ca3356dfe4a8a4369025a42b9d95cddb42846a5d",
  name: "setSquareRetailCategories",
  filename: "src/server/business.functions.ts"
}, (opts) => setSquareRetailCategories.__executeServer(opts));
const setSquareRetailCategories = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  ids: z.array(z.string().max(64)).max(500)
})).handler(setSquareRetailCategories_createServerFn_handler, async ({
  data
}) => {
  return attempt(async () => {
    await assertFeature("square");
    return saveSquareRetailCategories(data.ids);
  });
});
const squareSendCounts_createServerFn_handler = createServerRpc({
  id: "20723f37bc41103cd0144c7d0ce7e18d7b6062cfa212b7e82904cb65ec8c2434",
  name: "squareSendCounts",
  filename: "src/server/business.functions.ts"
}, (opts) => squareSendCounts.__executeServer(opts));
const squareSendCounts = createServerFn({
  method: "POST"
}).middleware([requireUser]).handler(squareSendCounts_createServerFn_handler, async () => {
  return attempt(async () => {
    await assertFeature("square");
    return sendAllCountsToSquare();
  });
});
const squareSyncSales_createServerFn_handler = createServerRpc({
  id: "61950064fb434c615d35ae38d62948d8050d86d3f1eb9fde646f08b2d3c1d55a",
  name: "squareSyncSales",
  filename: "src/server/business.functions.ts"
}, (opts) => squareSyncSales.__executeServer(opts));
const squareSyncSales = createServerFn({
  method: "POST"
}).middleware([requireUser]).handler(squareSyncSales_createServerFn_handler, async () => {
  return attempt(async () => {
    await assertFeature("square");
    return syncSquareSales();
  });
});
const quickbooksPushMonth_createServerFn_handler = createServerRpc({
  id: "7fef2669d1d6f3e9fdccdfbabede084b9e0823ba1f054366dd5ae9501cff565b",
  name: "quickbooksPushMonth",
  filename: "src/server/business.functions.ts"
}, (opts) => quickbooksPushMonth.__executeServer(opts));
const quickbooksPushMonth = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(MonthWindowSchema).handler(quickbooksPushMonth_createServerFn_handler, async ({
  data
}) => {
  return attempt(async () => {
    await assertFeature("quickbooks");
    return pushMonthToQuickBooks(data);
  });
});
export {
  addTeamMember_createServerFn_handler,
  createExpense_createServerFn_handler,
  disconnect_createServerFn_handler,
  editExpense_createServerFn_handler,
  getBudgetOverview_createServerFn_handler,
  getBusinessProfile_createServerFn_handler,
  getIntegrationErrorLog_createServerFn_handler,
  getIntegrations_createServerFn_handler,
  getSquareRetailCategories_createServerFn_handler,
  listExpenses_createServerFn_handler,
  listProductCategories_createServerFn_handler,
  listTeamMembers_createServerFn_handler,
  quickbooksPushMonth_createServerFn_handler,
  readReceiptPhoto_createServerFn_handler,
  removeExpense_createServerFn_handler,
  removeProductCategories_createServerFn_handler,
  removeTeamMember_createServerFn_handler,
  saveMonthBudget_createServerFn_handler,
  saveProductCategories_createServerFn_handler,
  setSquareRetailCategories_createServerFn_handler,
  squareImportCatalog_createServerFn_handler,
  squareSendCounts_createServerFn_handler,
  squareSyncSales_createServerFn_handler,
  suggestProduct_createServerFn_handler,
  updateBusinessProfile_createServerFn_handler
};
