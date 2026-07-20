import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await params;
  const { subject, from, to, cc, date, body, fileName } = await req.json();

  try {
    const email = await prisma.email.findUnique({
      where: { messageId },
      include: { file: true }
    });

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.email.update({
        where: { messageId },
        data: {
          subject: subject !== undefined ? subject : undefined,
          from: from !== undefined ? from : undefined,
          to: to !== undefined ? to : undefined,
          cc: cc !== undefined ? cc : undefined,
          date: date !== undefined ? (date ? new Date(date) : null) : undefined,
          body: body !== undefined ? body : undefined,
        }
      });

      if (fileName && email.fileId) {
        await tx.file.update({
          where: { id: email.fileId },
          data: { originalName: fileName }
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('PATCH Email API Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
