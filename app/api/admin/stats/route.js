import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/admin/stats - Dashboard analytics
export async function GET(request) {
    const user = authenticate(request);
    if (!user || !['admin', 'support'].includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [
        totalUsers, totalRiders, totalDrivers, totalMerchants,
        totalRides, completedRides, totalOrders, completedOrders,
        activeDrivers,
        recentRides, recentOrders,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'rider' } }),
        prisma.user.count({ where: { role: 'driver' } }),
        prisma.user.count({ where: { role: 'merchant' } }),
        prisma.ride.count(),
        prisma.ride.count({ where: { status: 'completed' } }),
        prisma.order.count(),
        prisma.order.count({ where: { status: 'delivered' } }),
        prisma.driverProfile.count({ where: { isOnline: true } }),
        prisma.ride.findMany({
            take: 5, orderBy: { createdAt: 'desc' },
            include: {
                rider: { select: { name: true, phone: true } },
                driver: { select: { name: true } },
            },
        }),
        prisma.order.findMany({
            take: 5, orderBy: { createdAt: 'desc' },
            include: { merchant: true },
        }),
    ]);

    // Revenue estimate
    const rideRevenue = await prisma.ride.aggregate({
        where: { status: 'completed' },
        _sum: { fareFinal: true },
    });
    const orderRevenue = await prisma.order.aggregate({
        where: { status: 'delivered' },
        _sum: { total: true },
    });

    const gmv = (rideRevenue._sum.fareFinal || 0) + (orderRevenue._sum.total || 0);
    const revenue = gmv * 0.15; // 15% commission

    return NextResponse.json({
        success: true,
        stats: {
            users: { total: totalUsers, riders: totalRiders, drivers: totalDrivers, merchants: totalMerchants },
            rides: { total: totalRides, completed: completedRides, completionRate: totalRides ? Math.round((completedRides / totalRides) * 100) : 0 },
            orders: { total: totalOrders, completed: completedOrders },
            fleet: { activeDrivers },
            financials: { gmv: Math.round(gmv), revenue: Math.round(revenue), currency: 'PKR' },
        },
        recent: { rides: recentRides, orders: recentOrders },
    });
}
