import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Define a set of default avatar URLs that already exist
const DEFAULT_AVATARS = [
  '/logo.png', // Using existing logo.png as fallback avatar
];

// POST /api/user/upload-image - Upload profile image
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session
    const userId = session.user.id;

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 2MB)' },
        { status: 400 }
      );
    }

    try {
      // Generate a unique filename using user ID and timestamp
      const timestamp = Date.now();
      const cleanUserId = userId.replace(/-/g, '').substring(0, 8);
      const fileExtension = file.type.split('/')[1] || 'jpg';
      const fileName = `${cleanUserId}-${timestamp}.${fileExtension}`;

      // Define paths
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'profile');
      const filePath = join(uploadDir, fileName);
      const fileUrl = `/uploads/profile/${fileName}`;

      // Ensure the upload directory exists
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Convert the file to an ArrayBuffer and then to a Uint8Array
      // Using Uint8Array instead of Buffer to avoid type issues
      const bytes = await file.arrayBuffer();
      const uint8Array = new Uint8Array(bytes);

      // Write the file to disk
      console.log(`Writing file to: ${filePath}`);
      await writeFile(filePath, uint8Array);
      console.log(`File saved successfully at: ${filePath}`);

      // Update user's image in database
      await prisma.user.update({
        where: { id: userId },
        data: { image: fileUrl },
      });

      return NextResponse.json({
        success: true,
        imageUrl: fileUrl,
      });
    } catch (error) {
      console.error('Error saving image:', error);
      return NextResponse.json(
        { error: 'Failed to save image to disk' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
