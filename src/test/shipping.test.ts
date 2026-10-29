import { describe, it, expect } from "vitest";
import { shippingParcel, chooseShippingOption } from "../../supabase/functions/_shared/shipping";

describe("shipping", () => {
  it("weighs one longsleeve at 200g plus packaging and fits the mailbox", () => {
    const parcel = shippingParcel([{ product_type: "longsleeve", quantity: 1 }]);
    expect(parcel.grams).toBe(300);
    expect(parcel.kind).toBe("mailbox");
  });
  it("uses a parcel for two longsleeves", () => {
    expect(shippingParcel([{ product_type: "longsleeve", quantity: 2 }]).kind).toBe("parcel");
  });
  it("weighs five longsleeves at 1000g plus packaging", () => {
    expect(shippingParcel([{ product_type: "longsleeve", quantity: 5 }]).weight.value).toBe("1.100");
  });
  it("weighs each cap at 100g and uses parcel shipping", () => {
    const parcel = shippingParcel([{ product_type: "cap", quantity: 2 }]);
    expect(parcel.grams).toBe(300);
    expect(parcel.kind).toBe("parcel");
  });
  it("ships mixed models together with one packing allowance", () => {
    expect(shippingParcel([{ product_type: "longsleeve", quantity: 2 }, { product_type: "cap", quantity: 1 }]).grams).toBe(600);
  });
  it("does not use the cheaper mailbox quote for a parcel", () => {
    const make = (code: string, form: string, price: string) => ({ code, functionalities: { form_factor: form, last_mile: "home_delivery" }, quotes: [{ price: { total: { value: price, currency: "EUR" } } }] });
    const options = [make("postnl:brievenbus", "letter", "3.85"), make("postnl:standard", "parcel", "6.25")];
    expect(chooseShippingOption(options, "parcel").cost).toBe(6.25);
    expect(chooseShippingOption(options, "mailbox").cost).toBe(3.85);
  });
  it("does not substitute a low fixed rate when no usable quote exists", () => {
    expect(() => chooseShippingOption([], "parcel")).toThrow();
  });
});