import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  isFcmConfigured,
  isValidFcmToken,
  registerPushToken,
  unregisterPushToken,
} from '@/lib/fcm-server';
import { isVpsDbEnabled } from '@/lib/vps-db';

const subscribeSchema = z.object({
  token: z.string().min(50).max(4096),
});

export async function GET() {
  return NextResponse.json({
    success: true,
    configured: isFcmConfigured(),
    storage: isVpsDbEnabled() ? 'vps' : 'firestore',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success || !isValidFcmToken(parsed.data.token)) {
      return NextResponse.json(
        { success: false, message: 'Invalid push token.' },
        { status: 400 }
      );
    }

    const vpsReady = isVpsDbEnabled();
    const fcmReady = isFcmConfigured();

    if (!vpsReady && !fcmReady) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: 'Background push credentials not configured on server yet.',
      });
    }

    await registerPushToken(parsed.data.token);

    return NextResponse.json({
      success: true,
      configured: fcmReady,
      storage: vpsReady ? 'vps' : 'firestore',
    });
  } catch (error) {
    console.error('Error in POST /api/push/subscribe:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save push subscription.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success || !isValidFcmToken(parsed.data.token)) {
      return NextResponse.json(
        { success: false, message: 'Invalid push token.' },
        { status: 400 }
      );
    }

    if (isVpsDbEnabled() || isFcmConfigured()) {
      await unregisterPushToken(parsed.data.token);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/push/subscribe:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to remove push subscription.' },
      { status: 500 }
    );
  }
}
