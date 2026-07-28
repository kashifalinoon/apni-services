import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function POST(request) {
    const user = authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { merchantId, items, deliveryAddress, deliveryLat, deliveryLng, paymentMethod, notes } = await request.json();

        if (!merchantId || !items?.length) {
            return NextResponse.json({ error: 'merchantId and items required' }, { status: 400 });
        }

        // Fetch menu items and calculate totals
        const menuItemIds = items.map(i => i.menuItemId);
        const menuItems = await prisma.menuItem.findMany({ where: { id: { in: menuItemIds }, merchantId } });

        let subtotal = 0;
        const orderItems = items.map(item => {
            const menuItem = menuItems.find(m => m.id === item.menuItemId);
            if (!menuItem) throw new Error(`Menu item ${item.menuItemId} not found`);
            const totalPrice = menuItem.price * item.quantity;
            subtotal += totalPrice;
            return { menuItemId: item.menuItemId, quantity: item.quantity, unitPrice: menuItem.price, totalPrice, notes: item.notes };
        });

        const deliveryFee = subtotal >= 1000 ? 0 : 100; // Free delivery over 1000 PKR
        const total = subtotal + deliveryFee;

        const order = await prisma.order.create({
            data: {
                customerId: user.userId,
                merchantId,
                subtotal,
                deliveryFee,
                total,
                paymentMethod: paymentMethod || 'cash',
                deliveryAddress: deliveryAddress || 'Delivery Address',
                deliveryLat: deliveryLat || 0,
                deliveryLng: deliveryLng || 0,
                notes,
                items: { create: orderItems },
            },
            include: { items: { include: { menuItem: true } }, merchant: true },
        });

        // Notify merchant via Socket.io
        if (global._io) {
            global._io.emit(`merchant:new_order`, { merchantId, orderId: order.id, total });
        }

        return NextResponse.json({ success: true, order }, { status: 201 });
    } catch (error) {
        console.error('[Orders POST]', error);
        return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
    }
}

export async function GET(request) {
    const user = authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'customer';
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let where = {};
    if (role === 'customer') where.customerId = user.userId;
    else if (role === 'merchant') {
        const merchant = await prisma.merchantProfile.findUnique({ where: { userId: user.userId } });
        if (!merchant) return NextResponse.json({ orders: [], total: 0 });
        where.merchantId = merchant.id;
    }
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                items: { include: { menuItem: true } },
                merchant: { include: { user: { select: { name: true } } } },
            },
        }),
        prisma.order.count({ where }),
    ]);

    return NextResponse.json({ success: true, orders, total, page });
}
