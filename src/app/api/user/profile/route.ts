import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/user/profile - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session
    const userId = session.user.id;

    // Fetch user from database with all profile fields
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        address: true,
        dob: true,
        panNumber: true,
        bankName: true,
        accountNumber: true,
        ifscCode: true,
        accountHolderName: true,
        kycVerified: true,
        walletBalance: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session
    const userId = session.user.id;

    // Get the request body
    const data = await request.json();
    console.log('Update profile request data:', data);

    // Validate input data
    const {
      name,
      phone,
      address,
      dob,
      panNumber,
      bankName,
      accountNumber,
      ifscCode,
      accountHolderName,
    } = data;

    // Fields that are allowed to be updated
    const updateData: {
      name?: string;
      phone?: string | null;
      address?: string | null;
      dob?: Date | null;
      panNumber?: string | null;
      bankName?: string | null;
      accountNumber?: string | null;
      ifscCode?: string | null;
      accountHolderName?: string | null;
    } = {};

    if (name) updateData.name = name;

    // Handle optional string fields
    updateData.phone = phone === '' ? null : phone;
    updateData.address = address === '' ? null : address;
    updateData.panNumber = panNumber === '' ? null : panNumber;
    updateData.bankName = bankName === '' ? null : bankName;
    updateData.accountNumber = accountNumber === '' ? null : accountNumber;
    updateData.ifscCode = ifscCode === '' ? null : ifscCode;
    updateData.accountHolderName =
      accountHolderName === '' ? null : accountHolderName;

    // Handle date field
    if (dob !== undefined) {
      updateData.dob = dob ? new Date(dob) : null;
    }

    console.log('Update data being sent to DB:', updateData);

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        address: true,
        dob: true,
        panNumber: true,
        bankName: true,
        accountNumber: true,
        ifscCode: true,
        accountHolderName: true,
        kycVerified: true,
        walletBalance: true,
        createdAt: true,
      },
    });

    console.log('Updated user data:', updatedUser);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}
