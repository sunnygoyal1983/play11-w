import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpaySecret) {
      console.error('RAZORPAY_KEY_SECRET is not configured');
      return NextResponse.json(
        { success: false, error: 'Payment verification is not configured' },
        { status: 500 }
      );
    }

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = await request.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: 'Missing payment verification fields' },
        { status: 400 }
      );
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;
    if (!isAuthentic) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Atomically claim the pending transaction to prevent double-credit races
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.transaction.updateMany({
        where: {
          reference: `Razorpay Order: ${razorpay_order_id}`,
          status: 'pending',
        },
        data: {
          status: 'completed',
          reference: `Razorpay Payment: ${razorpay_payment_id}`,
        },
      });

      if (claimed.count !== 1) {
        return { credited: false as const };
      }

      const transaction = await tx.transaction.findFirst({
        where: {
          reference: `Razorpay Payment: ${razorpay_payment_id}`,
          status: 'completed',
        },
      });

      if (!transaction) {
        throw new Error('Transaction missing after claim');
      }

      await tx.user.update({
        where: { id: transaction.userId },
        data: {
          walletBalance: {
            increment: transaction.amount,
          },
        },
      });

      return { credited: true as const };
    });

    if (!result.credited) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction not found or already processed',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and wallet updated successfully',
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
