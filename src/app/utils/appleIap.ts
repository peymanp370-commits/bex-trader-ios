import { Capacitor, registerPlugin } from "@capacitor/core";

type AppleProduct = {
  productId: string;
  displayName?: string;
  description?: string;
  price?: string;
};

type ApplePurchaseResult = {
  ok?: boolean;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  environment?: string;
  verification?: string;
  reason?: string;
  error?: string;
  message?: string;
};

type AppleIAPPlugin = {
  getProducts(options: { productIds: string[] }): Promise<{ ok: boolean; products: AppleProduct[] }>;
  purchase(options: { productId: string }): Promise<ApplePurchaseResult>;
};

const AppleIAP = registerPlugin<AppleIAPPlugin>("AppleIAP");

export const APPLE_IAP_PRODUCT_IDS = {
  basic: {
    monthly: "basic_monthly_v4",
    yearly: "basic_yearly_v4",
  },
  pro: {
    monthly: "pro_monthly_v4",
    yearly: "pro_yearly_v4",
  },
  vip: {
    monthly: "vip_monthly_v4",
    yearly: "vip_yearly_v4",
  },
  lifetime: "vip_lifetime",
} as const;

export function isNativeIOSApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function appleProductIdForPlan(planId: string, cycle: "monthly" | "yearly") {
  if (planId === "basic") return APPLE_IAP_PRODUCT_IDS.basic[cycle];
  if (planId === "pro") return APPLE_IAP_PRODUCT_IDS.pro[cycle];
  if (planId === "vip") return APPLE_IAP_PRODUCT_IDS.vip[cycle];
  if (planId === "lifetime") return APPLE_IAP_PRODUCT_IDS.lifetime;
  return "";
}

export async function startAppleIapPurchase(productId: string) {
  if (!isNativeIOSApp()) {
    throw new Error("Apple In-App Purchase is only available inside the iOS app.");
  }

  if (!productId) {
    throw new Error("Apple product id is missing.");
  }

  return AppleIAP.purchase({ productId });
}
