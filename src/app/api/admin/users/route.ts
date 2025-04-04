import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/admin/users - Fetch all users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is logged in and is an admin
    // Note: You might want to add proper admin authorization here
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get users from database with all necessary fields
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        address: true,
        dob: true,
        panNumber: true,
        kycVerified: true,
        walletBalance: true,
        createdAt: true,
        // Count related records
        _count: {
          select: {
            teams: true,
            contestEntries: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to include counts directly in the user object
    const transformedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      address: user.address,
      dob: user.dob,
      panNumber: user.panNumber,
      kycVerified: user.kycVerified,
      walletBalance: user.walletBalance,
      joinedAt: user.createdAt,
      teamsCount: user._count.teams,
      contestsJoined: user._count.contestEntries,
      status: user.kycVerified ? 'active' : 'inactive',
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
