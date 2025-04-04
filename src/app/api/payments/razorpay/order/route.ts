import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Razorpay from 'razorpay';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in to add money' },
        { status: 401 }
      );
    }

    // Get request body
    const { amount } = await request.json();

    // Validate amount
    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: 'Invalid amount: Minimum amount should be ₹100' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Amount in paisa (smallest currency unit)
      currency: 'INR',
      receipt: `rcpt_${user.id.substring(0, 8)}_${Date.now()
        .toString()
        .substring(0, 10)}`,
      notes: {
        userId: user.id,
        paymentType: 'wallet_deposit',
      },
    };

    const order = await razorpay.orders.create(options);

    // Create a pending transaction in the database
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: amount,
        type: 'deposit',
        status: 'pending',
        reference: `Razorpay Order: ${order.id}`,
      },
    });

    // Return the order details to the client
    return NextResponse.json({
      success: true,
      order,
      transaction,
      key: process.env.RAZORPAY_KEY_ID,
      amount: amount * 100,
      currency: 'INR',
      name: 'Play11 Fantasy',
      description: 'Add money to wallet',
      orderId: order.id,
      user: {
        name: user.name || 'User',
        email: user.email || '',
        id: user.id,
      },
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order', details: error },
      { status: 500 }
    );
  }
}
