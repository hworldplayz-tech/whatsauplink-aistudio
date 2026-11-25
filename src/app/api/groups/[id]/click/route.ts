import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { doc, getFirestore, increment, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { isVpsDbEnabled, vpsIncrementClick } from '@/lib/vps-db';

function getFirestoreInstance() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cleanId = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanId) {
      return NextResponse.json({ success: false, message: 'Invalid group ID.' }, { status: 400 });
    }

    if (isVpsDbEnabled()) {
      await vpsIncrementClick(cleanId);
    } else {
      const db = getFirestoreInstance();
      await updateDoc(doc(db, 'groups', cleanId), {
        clicks: increment(1),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn('Click tracking error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
