import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, signToken, generateOTP } from '@/lib/auth';

export async function POST(request) {
    try {
        const { name, phone, email, password, role } = await request.json();

        // Validate
        if (!name || !phone || !password) {
            return NextResponse.json({ error: 'Name, phone, and password are required' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const validRoles = ['rider', 'driver', 'merchant', 'admin'];
        const userRole = validRoles.includes(role) ? role : 'rider';

        // Check existing
        const existing = await prisma.user.findUnique({ where: { phone } });
        if (existing) {
            return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
        }
        if (email) {
            const existingEmail = await prisma.user.findUnique({ where: { email } });
            if (existingEmail) {
                return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
            }
        }

        const passwordHash = hashPassword(password);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                phone,
                email: email || null,
                passwordHash,
                role: userRole,
                isVerified: true, // Auto-verify in dev; use OTP in prod
            },
        });

        // Create role-specific profile
        if (userRole === 'rider') {
            await prisma.riderProfile.create({ data: { userId: user.id } });
        } else if (userRole === 'driver') {
            await prisma.driverProfile.create({ data: { userId: user.id } });
        }

        // Create wallet for all users
        await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });

        // Generate JWT
        const token = signToken({ userId: user.id, role: user.role, phone: user.phone });

        const response = NextResponse.json({
            success: true,
            message: 'Registration successful',
            user: {
                id: user.id, name: user.name, phone: user.phone,
                email: user.email, role: user.role
            },
            token,
        }, { status: 201 });

        // Set cookie
        response.cookies.set('token', token, {
            httpOnly: true, secure: false, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
        });

        return response;
    } catch (error) {
        console.error('[Register Error]', error);
        return NextResponse.json({ error: 'Registration failed', details: error.message }, { status: 500 });
    }
}
