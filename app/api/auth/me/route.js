import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function GET(request) {
    const user = authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userData = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
            id: true, name: true, phone: true, email: true, role: true,
            avatar: true, cnic: true, dateOfBirth: true, address: true,
            city: true, gender: true, isVerified: true, isActive: true, createdAt: true,
            wallet: { select: { balance: true, currency: true } },
            driverProfile: true,
            riderProfile: true,
            merchantProfile: true,
        },
    });
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true, user: userData });
}

export async function PATCH(request) {
    const user = authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { name, email, avatar, cnic, dateOfBirth, address, city, gender } = body;

        const updated = await prisma.user.update({
            where: { id: user.userId },
            data: {
                ...(name && { name }),
                ...(email !== undefined && { email: email || null }),
                ...(avatar !== undefined && { avatar }),
                ...(cnic !== undefined && { cnic }),
                ...(dateOfBirth !== undefined && { dateOfBirth }),
                ...(address !== undefined && { address }),
                ...(city !== undefined && { city }),
                ...(gender !== undefined && { gender }),
            },
            select: {
                id: true, name: true, phone: true, email: true, role: true,
                avatar: true, cnic: true, dateOfBirth: true, address: true,
                city: true, gender: true,
            },
        });

        return NextResponse.json({ success: true, user: updated });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
