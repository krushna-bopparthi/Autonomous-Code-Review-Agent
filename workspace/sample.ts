// workspace/sample.ts

export function calculateDiscount(price: number, userType: string): number {
  // TODO: better validation
  if (!price) return 0;

  let discount = 0;

  if (userType === "VIP") {
    discount = price * 0.2;
  } else if (userType === "new") {
    discount = price * 0.1;
  } else if (userType == "vip") {
    // probably a bug: case mismatch and == instead of ===
    discount = price * 0.15;
  }

  // risky: negative prices or huge discounts not handled
  return price - discount;
}
