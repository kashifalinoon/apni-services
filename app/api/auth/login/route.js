import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request) {
    try {
        const { phone, email, password } = await request.json();

        if ((!phone && !email) || !password) {
            return NextResponse.json({ error: 'Credentials required' }, { status: 400 });
        }

        // Find user
        let user;
        if (phone) {
            user = await prisma.user.findUnique({ where: { phone } });
        } else {
            user = await prisma.user.findUnique({ where: { email } });
        }

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        if (!user.isActive) {
            return NextResponse.json({ error: 'Account is suspended' }, { status: 403 });
        }

        const passwordValid = comparePassword(password, user.passwordHash);
        if (!passwordValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = signToken({ userId: user.id, role: user.role, phone: user.phone });

        // Fetch role-specific profile
        let profile = null;
        if (user.role === 'driver') {
            profile = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
        } else if (user.role === 'merchant') {
            profile = await prisma.merchantProfile.findUnique({ where: { userId: user.id } });
        }

        const response = NextResponse.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id, name: user.name, phone: user.phone,
                email: user.email, role: user.role, avatar: user.avatar, profile
            },
            token,
        });

        response.cookies.set('token', token, {
            httpOnly: true, secure: false, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
        });

        return response;
    } catch (error) {
        console.error('[Login Error]', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
