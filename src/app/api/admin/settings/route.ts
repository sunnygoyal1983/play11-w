import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthenticatedAdmin } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { fallbackSettings } from '@/lib/fallback-settings';

// Type guard to check if prisma has the setting model
function hasPrismaSettingModel(client: any): boolean {
  return client && typeof client['setting']?.findMany === 'function';
}

// GET /api/admin/settings - Retrieve all settings
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session?.user?.email);

    // Check if user is authenticated and is an admin
    const isAdmin = await isAuthenticatedAdmin(session);
    console.log('Is admin:', isAdmin);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const searchParams = new URL(req.url).searchParams;
    const category = searchParams.get('category');
    const publicOnly = searchParams.get('public') === 'true';

    // Default to fallback settings
    let settings = [...fallbackSettings];

    // Try to get settings from database if possible
    try {
      // Verify Prisma client has the Setting model
      if (hasPrismaSettingModel(prisma)) {
        const whereClause: any = {};

        if (category) {
          whereClause.category = category;
        }

        if (publicOnly) {
          whereClause.isPublic = true;
        }

        // Need to use any type here because TypeScript doesn't know about dynamic models
        const dbSettings = await (prisma as any).setting.findMany({
          where: whereClause,
          orderBy: [{ category: 'asc' }, { key: 'asc' }],
        });

        if (dbSettings && dbSettings.length > 0) {
          console.log(`Retrieved ${dbSettings.length} settings from database`);
          // Use database settings instead of fallbacks if available
          settings = dbSettings;
        } else {
          console.log('No settings found in database, using fallbacks');
        }
      } else {
        console.log(
          'Prisma Setting model not available, using fallback settings'
        );
      }
    } catch (error) {
      console.error('Database error when fetching settings:', error);
      console.log('Using fallback settings due to database error');

      // Apply filters to fallback settings
      if (category) {
        settings = settings.filter((s) => s.category === category);
      }

      if (publicOnly) {
        settings = settings.filter((s) => s.isPublic);
      }
    }

    return NextResponse.json(settings || []);
  } catch (error) {
    console.error('Error fetching settings:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings - Create a new setting
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin
    const isAdmin = await isAuthenticatedAdmin(session);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const data = await req.json();

    // Validate required fields
    if (!data.key || data.value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      );
    }

    // Check if Prisma Setting model is available
    if (!hasPrismaSettingModel(prisma)) {
      return NextResponse.json(
        {
          error: 'Database not configured',
          details:
            'The database is not properly configured for settings. Please run the migrations first.',
          key: data.key,
          value: data.value,
        },
        { status: 503 }
      );
    }

    try {
      // Check if setting with this key already exists
      const existingSetting = await (prisma as any).setting.findUnique({
        where: { key: data.key },
      });

      if (existingSetting) {
        return NextResponse.json(
          { error: 'Setting with this key already exists' },
          { status: 409 }
        );
      }

      // Create new setting
      const setting = await (prisma as any).setting.create({
        data: {
          key: data.key,
          value: String(data.value),
          type: data.type || 'string',
          category: data.category || 'general',
          description: data.description || null,
          isPublic: data.isPublic || false,
        },
      });

      return NextResponse.json(setting, { status: 201 });
    } catch (error) {
      console.error('Database error when creating setting:', error);

      // If the table doesn't exist, return a helpful error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'Settings table does not exist',
            details:
              'The settings migration needs to be applied first. Run `npx prisma migrate dev --name add-settings` to create the settings table.',
          },
          { status: 500 }
        );
      }

      throw error; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Error creating setting:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create setting', details: errorMessage },
      { status: 500 }
    );
  }
}
