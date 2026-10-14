import { NextRequest, NextResponse } from "next/server";
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

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 2MB)' },
        { status: 400 }
      );
    }

    try {
      const bytes = await file.arrayBuffer();
      const header = new Uint8Array(bytes).subarray(0, 12);
      const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      const isPng =
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4e &&
        header[3] === 0x47;
      const isWebp =
        header[0] === 0x52 &&
        header[1] === 0x49 &&
        header[2] === 0x46 &&
        header[3] === 0x46 &&
        header[8] === 0x57 &&
        header[9] === 0x45 &&
        header[10] === 0x42 &&
        header[11] === 0x50;

      const fileExtension = isJpeg ? 'jpg' : isPng ? 'png' : isWebp ? 'webp' : null;
      if (!fileExtension) {
        return NextResponse.json(
          { error: 'Only JPEG, PNG, and WebP images are allowed' },
          { status: 400 }
        );
      }

      const timestamp = Date.now();
      const cleanUserId = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
      const fileName = `${cleanUserId}-${timestamp}.${fileExtension}`;

      // Define paths
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'profile');
      const filePath = join(uploadDir, fileName);
      const fileUrl = `/uploads/profile/${fileName}`;

      // Ensure the upload directory exists
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

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
