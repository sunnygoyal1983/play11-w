import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthenticatedAdmin } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

// GET /api/admin/settings/:key - Get a single setting
export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const key = params.key;

    // For public settings, no authentication is needed
    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    // If setting is not public, check admin permission
    if (!setting.isPublic) {
      if (!(await isAuthenticatedAdmin(session))) {
        return NextResponse.json(
          { error: 'Unauthorized: Admin access required' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error(`Error fetching setting ${params.key}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch setting' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings/:key - Update a setting
export async function PUT(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const key = params.key;

    // Check if user is authenticated and is an admin
    if (!(await isAuthenticatedAdmin(session))) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const data = await req.json();

    // Check if setting exists
    const existingSetting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!existingSetting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    // Update the setting
    const updatedSetting = await prisma.setting.update({
      where: { key },
      data: {
        value:
          data.value !== undefined ? String(data.value) : existingSetting.value,
        type: data.type || existingSetting.type,
        category: data.category || existingSetting.category,
        description:
          data.description !== undefined
            ? data.description
            : existingSetting.description,
        isPublic:
          data.isPublic !== undefined
            ? data.isPublic
            : existingSetting.isPublic,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedSetting);
  } catch (error) {
    console.error(`Error updating setting ${params.key}:`, error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/settings/:key - Delete a setting
export async function DELETE(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const key = params.key;

    // Check if user is authenticated and is an admin
    if (!(await isAuthenticatedAdmin(session))) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    // Check if setting exists
    const existingSetting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!existingSetting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    // Delete the setting
    await prisma.setting.delete({
      where: { key },
    });

    return NextResponse.json(
      { message: `Setting '${key}' deleted successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting setting ${params.key}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete setting' },
      { status: 500 }
    );
  }
}
