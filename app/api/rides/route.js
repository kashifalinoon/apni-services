import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// POST /api/rides - Create ride request
export async function POST(request) {
    const user = authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const {
            pickupLat, pickupLng, pickupAddress,
            dropoffLat, dropoffLng, dropoffAddress,
            vehicleType, paymentMethod, scheduledAt, notes
        } = await request.json();

        if (!pickupLat || !dropoffLat) {
            return NextResponse.json({ error: 'Pickup and dropoff locations required' }, { status: 400 });
        }

        // Calculate distance using Haversine
        const distanceKm = getDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
        const durationMin = Math.ceil((distanceKm / 30) * 60); // Avg 30km/h in city

        // Calculate fare
        const fareEstimate = calculateFare(vehicleType || 'car', distanceKm);

        const ride = await prisma.ride.create({
            data: {
                riderId: user.userId,
                pickupLat: parseFloat(pickupLat),
                pickupLng: parseFloat(pickupLng),
                pickupAddress: pickupAddress || 'Pickup Location',
                dropoffLat: parseFloat(dropoffLat),
                dropoffLng: parseFloat(dropoffLng),
                dropoffAddress: dropoffAddress || 'Dropoff Location',
                vehicleType: vehicleType || 'car',
                fareEstimate,
                distanceKm,
                durationMin,
                paymentMethod: paymentMethod || 'cash',
                notes: notes || null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                status: 'requested',
            },
        });

        // Notify via Socket.io (if available)
        if (global._io) {
            global._io.emit('new:ride_request', {
                rideId: ride.id,
                vehicleType: ride.vehicleType,
                pickupLat, pickupLng, pickupAddress,
                fareEstimate,
            });
        }

        return NextResponse.json({ success: true, ride }, { status: 201 });
    } catch (error) {
        console.error('[Rides POST]', error);
        return NextResponse.json({ error: 'Failed to create ride', details: error.message }, { status: 500 });
    }
}

// GET /api/rides - Get rider's rides
export async function GET(request) {
    const user = authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const role = searchParams.get('role') || 'rider';

    const where = role === 'driver'
        ? { driverId: user.userId, ...(status && { status }) }
        : { riderId: user.userId, ...(status && { status }) };

    const [rides, total] = await Promise.all([
        prisma.ride.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                rider: { select: { id: true, name: true, phone: true, avatar: true } },
                driver: { select: { id: true, name: true, phone: true, avatar: true, driverProfile: true } },
                rating: true,
            },
        }),
        prisma.ride.count({ where }),
    ]);

    return NextResponse.json({ success: true, rides, total, page, pages: Math.ceil(total / limit) });
}

// Helpers
function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateFare(vehicleType, distanceKm) {
    const rates = {
        bike: { base: 50, perKm: 20 },
        rickshaw: { base: 70, perKm: 25 },
        car: { base: 150, perKm: 45 },
        car_xl: { base: 200, perKm: 65 },
        van: { base: 300, perKm: 80 },
    };
    const rate = rates[vehicleType] || rates.car;
    return Math.round(rate.base + rate.perKm * distanceKm);
}
