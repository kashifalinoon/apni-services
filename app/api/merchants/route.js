import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // restaurant, grocery, pharmacy
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where = { isOpen: true, ...(type && { businessType: type }) };

    const [merchants, total] = await Promise.all([
        prisma.merchantProfile.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                user: { select: { id: true, name: true } },
                menuCategories: { where: { isActive: true }, include: { items: { where: { isAvailable: true }, take: 5 } } },
            },
        }),
        prisma.merchantProfile.count({ where }),
    ]);

    return NextResponse.json({ success: true, merchants, total, page });
}

export async function POST(request) {
    const user = authenticate(request);
    if (!user || !['merchant', 'admin'].includes(user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessName, businessType, address, lat, lng, logo } = await request.json();

    const merchant = await prisma.merchantProfile.upsert({
        where: { userId: user.userId },
        update: { businessName, businessType, address, lat, lng, logo },
        create: { userId: user.userId, businessName, businessType: businessType || 'restaurant', address, lat, lng, logo },
    });

    return NextResponse.json({ success: true, merchant }, { status: 201 });
}
