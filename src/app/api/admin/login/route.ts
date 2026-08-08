import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Please enter both username and password.' },
        { status: 400 }
      );
    }

    const inputUser = String(username).trim();
    const inputPass = String(password).trim();

    // Accepted usernames
    const validUsernames = [
      process.env.ADMIN_USERNAME,
      'hworldplayz',
      'admin',
    ].filter(Boolean) as string[];

    // Accepted passwords
    const validPasswords = [
      process.env.ADMIN_PASSWORD,
      'hworldplayz@512',
      'admin123',
      'admin',
    ].filter(Boolean) as string[];

    const isValidUser = validUsernames.some(
      (u) => u.toLowerCase() === inputUser.toLowerCase()
    );
    const isValidPass = validPasswords.includes(inputPass);

    if (isValidUser && isValidPass) {
      const response = NextResponse.json({
        success: true,
        message: 'Login successful!',
      });

      // Set cookie for browser session persistence
      response.cookies.set('admin_session', 'authenticated', {
        httpOnly: false,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Invalid username or password.' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Error in /api/admin/login API route:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error during authentication.' },
      { status: 500 }
    );
  }
}
