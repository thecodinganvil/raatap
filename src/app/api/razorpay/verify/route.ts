import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await request.json();

    const secret = process.env.RAZORPAY_KEY_SECRET!;

    // Create a signature using the secret and the order/payment IDs
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      console.log("Payment signature verified successfully");
      return NextResponse.json({ success: true, verified: true });
    } else {
      console.log("Payment signature verification failed");
      return NextResponse.json(
        { success: false, verified: false, error: "Invalid signature" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error verifying payment signature:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
