import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isAuthenticatedAdmin } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin
    if (!(await isAuthenticatedAdmin(session))) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Build filter object
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // End of day

      where.createdAt = {
        ...where.createdAt,
        lte: endDateTime,
      };
    }

    // Search functionality - search in user details or reference
    if (search) {
      where.OR = [
        {
          reference: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          user: {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      ];
    }

    // Count total transactions with applied filters
    const totalTransactions = await prisma.transaction.count({
      where,
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalTransactions / pageSize);

    // Fetch transactions with include to get user data
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: pageSize,
    });

    // Transform the data for the frontend
    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction.id,
      userId: transaction.userId,
      userName: transaction.user.name,
      userEmail: transaction.user.email,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      description: transaction.reference, // Used as description in the UI
      reference: transaction.reference,
      createdAt: transaction.createdAt.toISOString(),
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        total: totalTransactions,
        page,
        pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
