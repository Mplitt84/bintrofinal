import { createRootRoute, HeadContent, Scripts, createFileRoute, lazyRouteComponent, createRouter } from "@tanstack/react-router";
import { jsxs, jsx } from "react/jsx-runtime";
import { T as TSS_SERVER_FUNCTION, g as getServerFnById, c as createServerFn } from "../server.js";
import { z } from "zod";
import { P as PAUSE_OPTIONS, c as completeCheckout, h as handleStripeWebhook, a as hasFeature } from "./account.server-IhIPs_LL.js";
import { M as MAX_ORDER_QTY } from "./inventory-defaults-BnRHgx1T.js";
import { T as TAX_GROUPS, d as displayBusinessName } from "./business-types-DKNVcfJE.js";
import { i as isCalendarToken, f as findCalendarEvents } from "./calendar.server-Ao_GjwJ3.js";
import { f as findBusinessProfile } from "./business.server-CHGYL_45.js";
import { PROVIDERS, completeAuthorization, StateMismatchError, isConfigured, buildAuthorizeUrl } from "./integrations.server-Cl39Wgfx.js";
const Route$9 = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8"
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover"
      },
      { name: "theme-color", content: "#fdf9f1" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Bintro" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      {
        title: "Bintro — Inventory & budget"
      }
    ]
  }),
  shellComponent: RootDocument
});
function RootDocument({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
var createSsrRpc = (functionId) => {
  const url = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    return (await getServerFnById(functionId))(...args);
  };
  return Object.assign(fn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const getAccount = createServerFn({
  method: "GET"
}).handler(createSsrRpc("afea1878bf48c9086830abe85f18bb485adeac1742249bf8e1bfb35363956c8f"));
const getBillingHistory = createServerFn({
  method: "GET"
}).handler(createSsrRpc("3bea34e8c3b0fbfe52545d91d30315224f93624ae4b9e5a4801b9e9893879d01"));
const saveAccountDetails = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  ownerName: z.string().trim().max(120).optional(),
  billingEmail: z.string().trim().max(200).optional()
})).handler(createSsrRpc("43cc7a8edb98bd999075fb69ecbbb34bb9603d834247277daa3e9d5bdad38a20"));
const selectPlan = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  plan: z.enum(["free", "plus", "premium"]),
  interval: z.enum(["month", "year"])
})).handler(createSsrRpc("b76fbe18471cd9060d1161ee22d718be183f5851c634a1406326b22726b2ede7"));
const lockInFounding = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  plan: z.enum(["plus", "premium"]),
  interval: z.enum(["month", "year"])
})).handler(createSsrRpc("fe93a3ad77c54a209c7c8881b54a5c6ae2b24476e2d00d3d589e925a6176595c"));
const pausePlan = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  months: z.number().int().refine((m) => PAUSE_OPTIONS.includes(m))
})).handler(createSsrRpc("1ad1730f395b5a8a4dc266d462ed91565b3e66792291cdcf5ab21e2547b6aa89"));
const resumePlan = createServerFn({
  method: "POST"
}).handler(createSsrRpc("59cca0435fb18284b1ca3d80b0a4eb25f62f617a7027a7fce94638dbe403bad2"));
const cancelSubscription = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  reason: z.string().trim().max(500)
})).handler(createSsrRpc("c25a68e26f74554b1b179308fba30707ad90eeaf434a3e5f00ab8ec420ffbd3e"));
const openPaymentPortal = createServerFn({
  method: "POST"
}).handler(createSsrRpc("0b508838fc462dd380fc8fc0ca7b8b04751230c28fd33cada81ad988012d63c1"));
const listProducts = createServerFn({
  method: "GET"
}).handler(createSsrRpc("ea3d7bea8c20602600fdb60763c4be2316202d598de73f0a4277d084c37c355f"));
createServerFn({
  method: "GET"
}).handler(createSsrRpc("3d2ac9b271549c34af9ee5dce1a7ea2b1a3bcbe29eebf79877cd5d28f2f53ae2"));
const getRecentMovements = createServerFn({
  method: "GET"
}).inputValidator((data) => data).handler(createSsrRpc("b426e6454f76618fb04a0e57c79174475f6d80f701b87711ee5aa288a5097fd1"));
const getMovementsSince = createServerFn({
  method: "GET"
}).inputValidator((data) => data).handler(createSsrRpc("d5932e99bf7f053e64a594d1fdf362428a631d07022086bdcf6f0a1e038509d3"));
createServerFn({
  method: "GET"
}).inputValidator((data) => data).handler(createSsrRpc("f4c024d9a3eed139097ac8eda8cbd4a30e614f60477534a0ab157167c8019fcb"));
const searchProducts = createServerFn({
  method: "GET"
}).inputValidator((data) => data).handler(createSsrRpc("8faec6748de68f1cf8ce6bfd57ca19807095ec135ffc3d4cdb0c2cb0363337c5"));
const CreateProductSchema = z.object({
  barcode: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  size: z.string().optional(),
  qty: z.number().int().optional(),
  reorderThreshold: z.number().int().optional(),
  maxQty: z.number().int().min(0).max(1e5).optional(),
  packSize: z.number().int().min(1).max(1e3).optional(),
  expiresOn: z.union([z.literal(""), z.literal("none"), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  unitCostCents: z.number().int().optional(),
  retailPriceCents: z.number().int().min(0).optional(),
  imageUrl: z.string().max(2e3).optional()
});
const createProduct = createServerFn({
  method: "POST"
}).inputValidator(CreateProductSchema).handler(createSsrRpc("1687560e98c420e589f15a5fc2d2cc5d10a436e40b36b3eb6abb8c02197449b8"));
const linkBarcodeToProduct = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("04be2dc3eebc2a4becde65112b9afb13adb203a17735c09bba4c8e90f72e118e"));
const UpdateProductSchema = z.object({
  productId: z.number().int(),
  name: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  size: z.string().optional(),
  reorderThreshold: z.number().int().optional(),
  maxQty: z.number().int().min(0).max(1e5).optional(),
  packSize: z.number().int().min(1).max(1e3).optional(),
  expiresOn: z.union([z.literal(""), z.literal("none"), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  unitCostCents: z.number().int().optional(),
  retailPriceCents: z.number().int().min(0).optional(),
  qty: z.number().int().optional(),
  imageUrl: z.string().max(2e3).optional(),
  /** Additional barcodes / SKUs that also scan to this product. */
  extraBarcodes: z.array(z.string().max(64)).max(20).optional(),
  staffName: z.string().optional()
});
const updateProduct = createServerFn({
  method: "POST"
}).inputValidator(UpdateProductSchema).handler(createSsrRpc("739f1912b13ae2d1e9d0af1e4adb44800b626440c5bad7fbe3aa6b25465176b4"));
const deleteProduct = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  productId: z.number().int().positive()
})).handler(createSsrRpc("e3cddd74ca07b524e465399894018ec004151db4484866ec05390653eea5fbb7"));
const mergeProducts = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  sourceId: z.number().int().positive(),
  targetId: z.number().int().positive()
})).handler(createSsrRpc("6467c210f1ed57f198690a8612b51bcdd7d4197117c6faf1fc3ad1ba62c8ca56"));
const ScanSchema = z.object({
  barcode: z.string().min(1),
  type: z.enum(["in", "out"]),
  qty: z.number().int().positive(),
  staffName: z.string().optional()
});
const scanMovement = createServerFn({
  method: "POST"
}).inputValidator(ScanSchema).handler(createSsrRpc("de608114b50d09a009d436bb8aea3edac098b1a6367204486c56b9a251a539ee"));
const undoMovement = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("0d694f5a8da3fad061ec4b881739a2d409b465c25ef86a11befd05d0ec15e2a0"));
const emailBelowPar = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("e69c8c8b0366f38ebfbd47e7ce0d88323949432c4f643959422c476707ca5071"));
const OrderLineSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(1).max(MAX_ORDER_QTY)
});
const PurchaseOrderSchema = z.object({
  lines: z.array(OrderLineSchema).min(1).max(500),
  staffName: z.string().optional(),
  note: z.string().max(500).optional()
});
const emailPurchaseOrder = createServerFn({
  method: "POST"
}).inputValidator(PurchaseOrderSchema).handler(createSsrRpc("6dc7bab5a0f94bd3275b2c76fec2fa343f66b7aadb9fe590a1d9e79cabf926c5"));
const lookupBarcodeDetails = createServerFn({
  method: "GET"
}).inputValidator((data) => data).handler(createSsrRpc("be6f8faa1b358b37786ef5ba3aa6ac47e341db0ae1b72c22975b3a3e562abc82"));
const LabelSchema = z.object({
  /** Base64 JPEG/PNG/WebP, already shrunk on the device before upload. */
  image: z.string().min(1).max(6e6),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"])
});
const readLabelPhoto = createServerFn({
  method: "POST"
}).inputValidator(LabelSchema).handler(createSsrRpc("c33f3e8f2d91dfc1479d0a17451f929c733f6c5e03e49d9073b2aadc07ae0be4"));
const readSpokenProduct = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  transcript: z.string().trim().min(1).max(1e3)
})).handler(createSsrRpc("03296ffa8e7c6513d87844145725c5215c0fad9b462343edb1da327e7019172f"));
const readStockPhotoFn = createServerFn({
  method: "POST"
}).inputValidator(LabelSchema.extend({
  deviceBarcode: z.string().trim().max(64).optional()
})).handler(createSsrRpc("5f35fa34e4a2d5a018c585948359b6a403cc4a51937689b89e57232a7e0373b4"));
const recordProductMovement = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  productId: z.number().int().positive(),
  type: z.enum(["in", "out"]),
  qty: z.number().int().positive().max(MAX_ORDER_QTY),
  staffName: z.string().optional(),
  /** What the photo showed, for the activity log. */
  captured: z.enum(["sku", "label"]).optional()
})).handler(createSsrRpc("4e453ef218bcaad133228783bdf43d236b2b5149aa3f05827d95d14448ef80ee"));
const BulkChangesSchema = z.object({
  category: z.string().trim().max(80),
  vendor: z.string().trim().max(120),
  brand: z.string().trim().max(160),
  reorderThreshold: z.number().int().min(0).max(1e5),
  maxQty: z.number().int().min(0).max(1e5),
  packSize: z.number().int().min(1).max(1e3),
  expiresOn: z.union([z.literal(""), z.literal("none"), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  unitCostCents: z.number().int().min(0).max(1e7),
  retailPriceCents: z.number().int().min(0).max(1e7)
}).partial();
const bulkUpdateProducts = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  productIds: z.array(z.number().int().positive()).min(1).max(2e3),
  changes: BulkChangesSchema
})).handler(createSsrRpc("473a0c24e2e34c7b181501451d8fbc96ec6351ec3f1c69ffa77bf41f657e6af8"));
const bulkDeleteProducts = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  productIds: z.array(z.number().int().positive()).min(1).max(2e3)
})).handler(createSsrRpc("7c5f50af97d50b9ab72780ff530d7d3ad36556de9a7937ff5bf96acb584a9d3c"));
const MONTH = z.string().regex(/^\d{4}-\d{2}$/);
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const MonthWindowSchema = z.object({
  key: MONTH,
  start: z.string(),
  end: z.string()
});
const getBusinessProfile = createServerFn({
  method: "GET"
}).handler(createSsrRpc("d970acd5d7af08a73c0ba47640fdc8328ef797f7c17c2c8f8e1b3374967e974f"));
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
const updateBusinessProfile = createServerFn({
  method: "POST"
}).inputValidator(ProfileSchema).handler(createSsrRpc("f58d1793ee2723bf0402eab4bd8f5a7dc554805eb2915147a259f18b58527477"));
const listTeamMembers = createServerFn({
  method: "GET"
}).handler(createSsrRpc("fae8e846587193e222a59fc22c1b526e3a4e748ce7615bc55c083b2922766d02"));
const addTeamMember = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  name: z.string().trim().min(1).max(60)
})).handler(createSsrRpc("98e7a6e61ac171aec6645c9a7bce643b01f8d83c6ee3fd69c2e152c87fd47a16"));
const removeTeamMember = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.number().int()
})).handler(createSsrRpc("d8c3d79a53d1d22a9c01e5728ba1973940ce39c40e8db772763db1acb4541fa3"));
const TaxGroupSchema = z.enum(TAX_GROUPS.map((g) => g.id));
const listProductCategories = createServerFn({
  method: "GET"
}).handler(createSsrRpc("7ce8966b25cd7f0cfcd5b0b9291d73f2a93896642781b7129af2f7d4efe27a0b"));
const saveProductCategories = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  items: z.array(z.object({
    name: z.string().trim().min(1).max(60),
    taxGroup: TaxGroupSchema
  })).max(100)
})).handler(createSsrRpc("79714bd1315f8ca197b45f48ebcb30c863035c6713c2eaebe0af06fbf3799920"));
const removeProductCategories = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  ids: z.array(z.number().int()).max(200)
})).handler(createSsrRpc("0cab1653405c989dbe1a925b0e1a6ca0a0f3152f416a3bb686cb270ded1ac2d1"));
const getBudgetOverview = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  months: z.array(MonthWindowSchema).min(1).max(24)
})).handler(createSsrRpc("60c53bd292604ab49247ff833410708f26f67d1a410b06ea0fc1e42757d81427"));
const listExpenses = createServerFn({
  method: "GET"
}).inputValidator(z.object({
  month: MONTH
})).handler(createSsrRpc("8354b80e0ab29cbb323d00a85f10147647b566a9a1f39be7b061b767cd620249"));
const ExpenseSchema = z.object({
  spentOn: DAY,
  amountCents: z.number().int().min(1).max(1e9),
  category: z.string().max(60).optional(),
  vendor: z.string().max(120).optional(),
  note: z.string().max(300).optional(),
  staffName: z.string().max(60).optional()
});
const createExpense = createServerFn({
  method: "POST"
}).inputValidator(ExpenseSchema).handler(createSsrRpc("49853aa174a5c462bef69456eecd66b5c7039e75c14d31a2cee30b492f4762b3"));
const editExpense = createServerFn({
  method: "POST"
}).inputValidator(ExpenseSchema.partial().extend({
  id: z.number().int()
})).handler(createSsrRpc("4b1d7b597eabf67b74428f099b57382fd027b27eb2c3e57e1cdd6f8ed9bbd37f"));
const removeExpense = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.number().int()
})).handler(createSsrRpc("7ea615c7b8d6e00557d0d359a13f245370ea95ccc774d34cda10fcaa53ba1d50"));
const saveMonthBudget = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  month: MONTH,
  amountCents: z.number().int().min(0).max(1e9).nullable()
})).handler(createSsrRpc("6067ddb4ac537c8fa1023b6006799e98d4516de28d608cb0a2d2d868ea54c330"));
const suggestProduct = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  brand: z.string().max(160),
  name: z.string().max(200),
  size: z.string().max(60),
  category: z.string().max(80),
  vendor: z.string().max(120)
})).handler(createSsrRpc("e05fc2fa0ed66607af2fc2fccf41b61c3153608b3b0e488870282e4d9929064e"));
const readReceiptPhoto = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  image: z.string().min(1).max(6e6),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"])
})).handler(createSsrRpc("a974410b51934831b8bced98077808c30b4018bf4410fda89228573e360ae3d9"));
const getIntegrations = createServerFn({
  method: "GET"
}).handler(createSsrRpc("b06120bf660a285feb8c23b17355192686a94b8f95623ceae33570d7526402b4"));
const ProviderSchema = z.object({
  provider: z.enum(["square", "quickbooks"])
});
const disconnect = createServerFn({
  method: "POST"
}).inputValidator(ProviderSchema).handler(createSsrRpc("cee688b920afcb247e533bef8972f2caef04ad0aedf980b312a4aae716be36db"));
const squareImportCatalog = createServerFn({
  method: "POST"
}).handler(createSsrRpc("14a0f7ff335f0a1bc922563407a7e578abcdef957f4a28aac6db963311b18ba0"));
const getSquareRetailCategories = createServerFn({
  method: "GET"
}).handler(createSsrRpc("a85d992ef0dd5f80187a82d58000361d4951db8ac255a3fc40c2c2ad1ade692a"));
const setSquareRetailCategories = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  ids: z.array(z.string().max(64)).max(500)
})).handler(createSsrRpc("20d79206e108af8af93f7352ca3356dfe4a8a4369025a42b9d95cddb42846a5d"));
const squareSendCounts = createServerFn({
  method: "POST"
}).handler(createSsrRpc("20723f37bc41103cd0144c7d0ce7e18d7b6062cfa212b7e82904cb65ec8c2434"));
const squareSyncSales = createServerFn({
  method: "POST"
}).handler(createSsrRpc("61950064fb434c615d35ae38d62948d8050d86d3f1eb9fde646f08b2d3c1d55a"));
const quickbooksPushMonth = createServerFn({
  method: "POST"
}).inputValidator(MonthWindowSchema).handler(createSsrRpc("7fef2669d1d6f3e9fdccdfbabede084b9e0823ba1f054366dd5ae9501cff565b"));
const $$splitComponentImporter$3 = () => import("./index-D3omWW0m.js");
const Route$8 = createFileRoute("/")({
  loader: async () => {
    const [products, recent, profile, team, categories, account] = await Promise.all([listProducts(), getRecentMovements({
      data: {
        limit: 25
      }
    }), getBusinessProfile(), listTeamMembers(), listProductCategories(), getAccount()]);
    return {
      products,
      recent,
      profile,
      team,
      categories,
      account
    };
  },
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./eula-gtKERv-H.js");
const Route$7 = createFileRoute("/eula")({
  head: () => ({
    meta: [{
      title: "End-User License Agreement · Bintro"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./privacy-_50QH73Q.js");
const Route$6 = createFileRoute("/privacy")({
  head: () => ({
    meta: [{
      title: "Privacy Policy · Bintro"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./terms-BMR9Aw2S.js");
const Route$5 = createFileRoute("/terms")({
  head: () => ({
    meta: [{
      title: "Terms of Service · Bintro"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const Route$4 = createFileRoute("/api/billing/return")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const back = (query) => Response.redirect(`${url.origin}/?${new URLSearchParams({ settings: "account", ...query })}`, 302);
        const sessionId = url.searchParams.get("session_id");
        if (!sessionId) return back({ billing: "canceled" });
        try {
          const plan = await completeCheckout(sessionId);
          return back({ billing: "subscribed", plan });
        } catch (error) {
          console.error("Checkout return failed", error);
          return back({ billing: "failed" });
        }
      }
    }
  }
});
const Route$3 = createFileRoute("/api/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.text();
        try {
          await handleStripeWebhook(payload, request.headers.get("stripe-signature") ?? "");
          return new Response("ok");
        } catch (error) {
          console.error("Stripe webhook rejected", error);
          return new Response("Bad request", { status: 400 });
        }
      }
    }
  }
});
const EVENT_KINDS = [
  { id: "reorder", label: "Reorder", dot: "bg-action", tint: "bg-action-tint text-action" },
  { id: "delivery", label: "Delivery", dot: "bg-good", tint: "bg-good-tint text-good" },
  { id: "count", label: "Stock count", dot: "bg-[#3d5a80]", tint: "bg-[#e6edf5] text-[#3d5a80]" },
  { id: "bill", label: "Bill due", dot: "bg-warn", tint: "bg-warn-tint text-warn" },
  { id: "tax", label: "Tax date", dot: "bg-bad", tint: "bg-bad-tint text-bad" },
  { id: "task", label: "Task", dot: "bg-ink-2", tint: "bg-surface text-ink-2" }
];
const REPEATS = [
  { id: "none", label: "Once" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" }
];
function eventKind(id) {
  return EVENT_KINDS.find((k) => k.id === id) ?? EVENT_KINDS[EVENT_KINDS.length - 1];
}
const pad = (n) => String(n).padStart(2, "0");
function parseDay(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toDay(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function addMonths(base, months, day) {
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return target;
}
function occurrences(event, from, to, limit = 400) {
  const start = parseDay(event.date);
  const out = [];
  if (event.repeat === "none") {
    if (event.date >= from && event.date <= to) out.push(event.date);
    return out;
  }
  const step = { weekly: 0, monthly: 1, quarterly: 3, yearly: 12 }[event.repeat];
  for (let i = 0; i < limit; i++) {
    const d = event.repeat === "weekly" ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7) : addMonths(start, i * step, start.getDate());
    const key = toDay(d);
    if (key > to) break;
    if (key >= from) out.push(key);
  }
  return out;
}
function occurrenceRange(event, day) {
  const start = parseDay(day);
  if (!event.startTime) {
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end, allDay: true };
  }
  const [h, m] = event.startTime.split(":").map(Number);
  start.setHours(h, m);
  return { start, end: new Date(start.getTime() + Math.max(5, event.durationMinutes) * 6e4), allDay: false };
}
function formatTime(hhmm) {
  if (!hhmm) return "All day";
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2e3, 0, 1, h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: m ? "2-digit" : void 0 });
}
function rrule(repeat) {
  switch (repeat) {
    case "weekly":
      return "FREQ=WEEKLY";
    case "monthly":
      return "FREQ=MONTHLY";
    case "quarterly":
      return "FREQ=MONTHLY;INTERVAL=3";
    case "yearly":
      return "FREQ=YEARLY";
    default:
      return "";
  }
}
const utcStamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dayStamp = (d) => toDay(d).replace(/-/g, "");
function googleCalendarUrl(event, day = event.date) {
  const { start, end, allDay } = occurrenceRange(event, day);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: allDay ? `${dayStamp(start)}/${dayStamp(end)}` : `${utcStamp(start)}/${utcStamp(end)}`,
    details: event.notes
  });
  const rule = rrule(event.repeat);
  if (rule) params.set("recur", `RRULE:${rule}`);
  return `https://calendar.google.com/calendar/render?${params}`;
}
function outlookCalendarUrl(event, work, day = event.date) {
  const { start, end, allDay } = occurrenceRange(event, day);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    body: event.notes,
    startdt: allDay ? toDay(start) : start.toISOString(),
    enddt: allDay ? toDay(end) : end.toISOString()
  });
  if (allDay) params.set("allday", "true");
  return `https://outlook.${work ? "office" : "live"}.com/calendar/0/deeplink/compose?${params}`;
}
function subscribeUrls(feedUrl, name) {
  const webcal = feedUrl.replace(/^https?:/, "webcal:");
  const outlook = (host) => `https://outlook.${host}.com/calendar/0/addfromweb?${new URLSearchParams({ url: feedUrl, name })}`;
  return {
    google: `https://calendar.google.com/calendar/r?${new URLSearchParams({ cid: webcal })}`,
    outlook: outlook("live"),
    outlookWork: outlook("office"),
    apple: webcal
  };
}
function escapeText(v) {
  return v.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
}
function fold(line) {
  const parts = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  parts.push(rest);
  return parts.join("\r\n");
}
function buildIcs(events, calendarName, host) {
  const now = utcStamp(/* @__PURE__ */ new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bintro//Business calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H"
  ];
  for (const e of events) {
    const { start, end, allDay } = occurrenceRange(e, e.date);
    const local = (d) => `${dayStamp(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:bintro-event-${e.id}@${host}`,
      `DTSTAMP:${now}`,
      allDay ? `DTSTART;VALUE=DATE:${dayStamp(start)}` : `DTSTART:${local(start)}`,
      allDay ? `DTEND;VALUE=DATE:${dayStamp(end)}` : `DTEND:${local(end)}`,
      `SUMMARY:${escapeText(e.title)}`,
      `CATEGORIES:${escapeText(eventKind(e.kind).label)}`
    );
    if (e.notes) lines.push(`DESCRIPTION:${escapeText(e.notes)}`);
    const rule = rrule(e.repeat);
    if (rule) lines.push(`RRULE:${rule}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
function estimatedTaxDates(today = /* @__PURE__ */ new Date()) {
  const todayKey = toDay(today);
  const year = today.getFullYear();
  return [
    { md: "04-15", title: "Q1 estimated tax payment due" },
    { md: "06-15", title: "Q2 estimated tax payment due" },
    { md: "09-15", title: "Q3 estimated tax payment due" },
    { md: "01-15", title: "Q4 estimated tax payment due" }
  ].map(({ md, title }) => {
    const thisYear = `${year}-${md}`;
    return { title, date: thisYear >= todayKey ? thisYear : `${year + 1}-${md}` };
  });
}
const Route$2 = createFileRoute("/api/calendar/$feed")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const token = params.feed.replace(/\.ics$/i, "");
        if (!await isCalendarToken(token)) return new Response("Calendar not found", { status: 404 });
        const [events, profile] = await Promise.all([findCalendarEvents(), findBusinessProfile()]);
        const name = `${displayBusinessName(profile)} · Bintro`;
        return new Response(buildIcs(events, name, new URL(request.url).host), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="bintro.ics"',
            "Cache-Control": "public, max-age=300"
          }
        });
      }
    }
  }
});
const Route$1 = createFileRoute("/api/integrations/$provider/callback")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const provider = params.provider;
        if (!PROVIDERS.includes(provider)) return new Response("Unknown integration", { status: 404 });
        const back = (query) => Response.redirect(`${url.origin}/?${new URLSearchParams({ settings: "integrations", ...query })}`, 302);
        const code = url.searchParams.get("code");
        if (!code) return back({ error: `${provider}-declined` });
        try {
          await completeAuthorization(
            provider,
            {
              code,
              state: url.searchParams.get("state") ?? "",
              realmId: url.searchParams.get("realmId") ?? void 0
            },
            url.origin
          );
          return back({ connected: provider });
        } catch (error) {
          console.error(`${provider} connect failed`, error);
          return back({ error: `${provider}-${error instanceof StateMismatchError ? "expired" : "failed"}` });
        }
      }
    }
  }
});
const Route = createFileRoute("/api/integrations/$provider/connect")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const origin = new URL(request.url).origin;
        const provider = params.provider;
        if (!PROVIDERS.includes(provider)) return new Response("Unknown integration", { status: 404 });
        if (!await hasFeature(provider)) {
          return Response.redirect(`${origin}/?settings=account&error=${provider}-upgrade`, 302);
        }
        if (!isConfigured(provider)) {
          return Response.redirect(`${origin}/?settings=integrations&error=${provider}-not-configured`, 302);
        }
        return Response.redirect(await buildAuthorizeUrl(provider, origin), 302);
      }
    }
  }
});
const IndexRoute = Route$8.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$9
});
const EulaRoute = Route$7.update({
  id: "/eula",
  path: "/eula",
  getParentRoute: () => Route$9
});
const PrivacyRoute = Route$6.update({
  id: "/privacy",
  path: "/privacy",
  getParentRoute: () => Route$9
});
const TermsRoute = Route$5.update({
  id: "/terms",
  path: "/terms",
  getParentRoute: () => Route$9
});
const ApiBillingReturnRoute = Route$4.update({
  id: "/api/billing/return",
  path: "/api/billing/return",
  getParentRoute: () => Route$9
});
const ApiBillingWebhookRoute = Route$3.update({
  id: "/api/billing/webhook",
  path: "/api/billing/webhook",
  getParentRoute: () => Route$9
});
const ApiCalendarFeedRoute = Route$2.update({
  id: "/api/calendar/$feed",
  path: "/api/calendar/$feed",
  getParentRoute: () => Route$9
});
const ApiIntegrationsProviderCallbackRoute = Route$1.update({
  id: "/api/integrations/$provider/callback",
  path: "/api/integrations/$provider/callback",
  getParentRoute: () => Route$9
});
const ApiIntegrationsProviderConnectRoute = Route.update({
  id: "/api/integrations/$provider/connect",
  path: "/api/integrations/$provider/connect",
  getParentRoute: () => Route$9
});
const rootRouteChildren = {
  IndexRoute,
  EulaRoute,
  PrivacyRoute,
  TermsRoute,
  ApiBillingReturnRoute,
  ApiBillingWebhookRoute,
  ApiCalendarFeedRoute,
  ApiIntegrationsProviderCallbackRoute,
  ApiIntegrationsProviderConnectRoute
};
const routeTree = Route$9._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const router2 = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  removeTeamMember as $,
  eventKind as A,
  formatTime as B,
  estimatedTaxDates as C,
  googleCalendarUrl as D,
  EVENT_KINDS as E,
  outlookCalendarUrl as F,
  subscribeUrls as G,
  buildIcs as H,
  getBudgetOverview as I,
  listExpenses as J,
  getIntegrations as K,
  quickbooksPushMonth as L,
  editExpense as M,
  createExpense as N,
  readReceiptPhoto as O,
  removeExpense as P,
  saveMonthBudget as Q,
  REPEATS as R,
  resumePlan as S,
  lockInFounding as T,
  cancelSubscription as U,
  getBillingHistory as V,
  saveAccountDetails as W,
  selectPlan as X,
  openPaymentPortal as Y,
  pausePlan as Z,
  addTeamMember as _,
  readSpokenProduct as a,
  getSquareRetailCategories as a0,
  disconnect as a1,
  setSquareRetailCategories as a2,
  squareImportCatalog as a3,
  squareSyncSales as a4,
  squareSendCounts as a5,
  Route$8 as a6,
  listProducts as a7,
  getRecentMovements as a8,
  getAccount as a9,
  router as aa,
  readLabelPhoto as b,
  createSsrRpc as c,
  suggestProduct as d,
  readStockPhotoFn as e,
  createProduct as f,
  recordProductMovement as g,
  getMovementsSince as h,
  searchProducts as i,
  scanMovement as j,
  linkBarcodeToProduct as k,
  lookupBarcodeDetails as l,
  bulkUpdateProducts as m,
  updateBusinessProfile as n,
  mergeProducts as o,
  deleteProduct as p,
  updateProduct as q,
  removeProductCategories as r,
  saveProductCategories as s,
  bulkDeleteProducts as t,
  undoMovement as u,
  emailBelowPar as v,
  emailPurchaseOrder as w,
  toDay as x,
  parseDay as y,
  occurrences as z
};
