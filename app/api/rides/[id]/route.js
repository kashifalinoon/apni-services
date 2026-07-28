import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/rides/[id]
export async function GET(request, { params }) {
    const user = authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ride = await prisma.ride.findUnique({
        where: { id: params.id },
        include: {
            rider: { select: { id: true, name: true, phone: true, avatar: true } },
            driver: {
                select: {
                    id: true, name: true, phone: true, avatar: true,
                    driverProfile: { select: { vehicleMake: true, vehicleModel: true, vehiclePlate: true, vehicleType: true, rating: true, currentLat: true, currentLng: true } }
                }
            },
            rating: true,
        },
    });

    if (!ride) return NextResponse.json({ error: 'Ride not found' }, { status: 404 });

    return NextResponse.json({ success: true, ride });
}

// PATCH /api/rides/[id] - Update ride status
export async function PATCH(request, { params }) {
    const user = authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { status, driverId, cancelReason, fareFinal } = await request.json();

    const ride = await prisma.ride.findUnique({ where: { id: params.id } });
    if (!ride) return NextResponse.json({ error: 'Ride not found' }, { status: 404 });

    const updateData = { status, updatedAt: new Date() };
    if (driverId) updateData.driverId = driverId;
    if (cancelReason) updateData.cancelReason = cancelReason;
    if (fareFinal) updateData.fareFinal = fareFinal;
    if (status === 'started') updateData.startedAt = new Date();
    if (status === 'completed') {
        updateData.completedAt = new Date();
        updateData.fareFinal = fareFinal || ride.fareEstimate;
        // Update driver earnings
        await prisma.driverProfile.update({
            where: { userId: ride.driverId },
            data: { totalRides: { increment: 1 }, totalEarnings: { increment: updateData.fareFinal * 0.8 } },
        });
    }

    const updated = await prisma.ride.update({ where: { id: params.id }, data: updateData });

    // Notify via Socket.io
    if (global._io) {
        global._io.to(`ride:${params.id}`).emit('ride:status', {
            rideId: params.id, status, updatedBy: user.userId,
        });
    }

    return NextResponse.json({ success: true, ride: updated });
}
