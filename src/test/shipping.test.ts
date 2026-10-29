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
  it("accepts the mailbox delivery functionality returned by Sendcloud", () => {
    expect(chooseShippingOption([{ code: "postnl:brievenbus", functionalities: { form_factor: "mailbox", last_mile: "mailbox" }, quotes: [{ price: { total: { value: "4.65", currency: "EUR" } } }] }], "mailbox").cost).toBe(4.65);
  });
  it("rejects a 10 liter parcel option for a larger box", () => {
    const options = [
      { code: "postnl:small", functionalities: { form_factor: "parcel", last_mile: "home_delivery" }, quotes: [{ price: { total: { value: "7.08", currency: "EUR" } } }] },
      { code: "postnl:standard", functionalities: { form_factor: "parcel", last_mile: "home_delivery" }, quotes: [{ price: { total: { value: "7.58", currency: "EUR" } } }] },
    ];
    expect(chooseShippingOption(options, "parcel", { length: "40", width: "30", height: "15", unit: "cm" }).option.code).toBe("postnl:standard");
  });
});