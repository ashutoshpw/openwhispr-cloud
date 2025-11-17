import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";

export const registerPayment = async (
  email: string,
  amount: string,
  payment: string,
  type: string,
  payment_time: string,
  payment_date: string,
  receipt_email: string,
  receipt_url: string,
  payment_details: string,
  billing_details: string,
  currency: string
) => {
  try {
    const data = await db
      .insert(payments)
      .values({
        email,
        amount,
        payment,
        type,
        payment_time,
        payment_date,
        receipt_email,
        receipt_url,
        payment_details,
        billing_details,
        currency,
      })
      .returning();

    return {
      message: "success",
      data,
    };
  } catch (error) {
    console.error("Payment registration error:", error);
    return {
      message: "error",
      error,
    };
  }
};
