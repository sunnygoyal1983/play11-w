import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Get payment details from the request
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      transactionId,
    } = await request.json();

    // Verify the payment signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Find the transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        reference: `Razorpay Order: ${razorpay_order_id}`,
        status: 'pending',
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Update the transaction to completed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'completed',
        reference: `Razorpay Payment: ${razorpay_payment_id}`,
      },
    });

    // Add the amount to user's wallet
    await prisma.user.update({
      where: { id: transaction.userId },
      data: {
        walletBalance: {
          increment: transaction.amount,
        },
      },
    });

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
