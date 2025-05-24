import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.contest.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({ message: 'Contest deleted successfully' });
  } catch (error) {
    console.error('Error deleting contest:', error);
    return NextResponse.json(
      { error: 'Failed to delete contest' },
      { status: 500 }
    );
  }
}