const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Apni Services database...');

    const hash = (pw) => bcrypt.hashSync(pw, 12);

    // 1. Admin
    const admin = await prisma.user.upsert({
        where: { phone: '03004444444' },
        update: {},
        create: {
            name: 'Admin User', phone: '03004444444', email: 'admin@apniservices.pk',
            passwordHash: hash('pass123'), role: 'admin', isVerified: true,
            wallet: { create: { balance: 0 } },
        },
    });
    console.log('✅ Admin created:', admin.id);

    // 2. Rider
    const rider = await prisma.user.upsert({
        where: { phone: '03001111111' },
        update: {},
        create: {
            name: 'Ahmed Khan', phone: '03001111111', email: 'ahmed@example.com',
            passwordHash: hash('pass123'), role: 'rider', isVerified: true,
            riderProfile: { create: {} },
            wallet: { create: { balance: 500 } },
        },
    });
    console.log('✅ Rider created:', rider.id);

    // 3. Driver
    const driver = await prisma.user.upsert({
        where: { phone: '03002222222' },
        update: {},
        create: {
            name: 'Ali Hassan', phone: '03002222222', email: 'ali@example.com',
            passwordHash: hash('pass123'), role: 'driver', isVerified: true,
            driverProfile: {
                create: {
                    vehicleType: 'bike', vehicleMake: 'Honda', vehicleModel: 'CG125',
                    vehiclePlate: 'LEA-2024', approvalStatus: 'approved',
                    rating: 4.9, totalRides: 142, totalEarnings: 85000,
                },
            },
            wallet: { create: { balance: 2500 } },
        },
    });
    console.log('✅ Driver created:', driver.id);

    // 4. Merchant user
    const merchant = await prisma.user.upsert({
        where: { phone: '03003333333' },
        update: {},
        create: {
            name: 'Lahori Bites', phone: '03003333333', email: 'lahori@example.com',
            passwordHash: hash('pass123'), role: 'merchant', isVerified: true,
            wallet: { create: { balance: 12000 } },
        },
    });

    // Merchant profile (separate upsert to avoid nested create conflict)
    const merchantProfile = await prisma.merchantProfile.upsert({
        where: { userId: merchant.id },
        update: {},
        create: {
            userId: merchant.id, businessName: 'Lahori Bites', businessType: 'restaurant',
            address: 'Main Boulevard, DHA Phase 5, Lahore', lat: 31.481, lng: 74.403,
            rating: 4.7, totalOrders: 1240, commission: 15,
        },
    });

    // Menu categories
    const cats = await Promise.all([
        prisma.menuCategory.upsert({ where: { id: 'cat-main-001' }, update: {}, create: { id: 'cat-main-001', merchantId: merchantProfile.id, name: 'Main Course', sortOrder: 1 } }),
        prisma.menuCategory.upsert({ where: { id: 'cat-fast-001' }, update: {}, create: { id: 'cat-fast-001', merchantId: merchantProfile.id, name: 'Fast Food', sortOrder: 2 } }),
        prisma.menuCategory.upsert({ where: { id: 'cat-side-001' }, update: {}, create: { id: 'cat-side-001', merchantId: merchantProfile.id, name: 'Sides & Drinks', sortOrder: 3 } }),
    ]);

    // Menu items
    const menuItemsData = [
        { id: 'mi-001', merchantId: merchantProfile.id, categoryId: cats[0].id, name: 'Chicken Biryani', description: 'Fragrant basmati rice with tender chicken', price: 340 },
        { id: 'mi-002', merchantId: merchantProfile.id, categoryId: cats[0].id, name: 'Beef Karahi', description: 'Spicy wok-fried beef with tomatoes', price: 480 },
        { id: 'mi-003', merchantId: merchantProfile.id, categoryId: cats[1].id, name: 'Burger Meal', description: 'Chicken burger with fries and drink', price: 450 },
        { id: 'mi-004', merchantId: merchantProfile.id, categoryId: cats[1].id, name: 'Pizza (Large)', description: '12 inch with choice of toppings', price: 890 },
        { id: 'mi-005', merchantId: merchantProfile.id, categoryId: cats[2].id, name: 'Raita', description: 'Fresh yogurt with herbs', price: 80 },
        { id: 'mi-006', merchantId: merchantProfile.id, categoryId: cats[2].id, name: 'Soft Drink 500ml', description: 'Chilled soft drink', price: 60 },
    ];
    for (const item of menuItemsData) {
        await prisma.menuItem.upsert({ where: { id: item.id }, update: {}, create: item });
    }
    console.log('✅ Merchant + 6 menu items created');

    // 5. Demo Rides
    await prisma.ride.create({
        data: {
            riderId: rider.id, driverId: driver.id, vehicleType: 'bike',
            pickupLat: 31.5204, pickupLng: 74.3587, pickupAddress: 'DHA Phase 4 Gate, Lahore',
            dropoffLat: 31.511, dropoffLng: 74.361, dropoffAddress: 'Gulberg III, Lahore',
            status: 'completed', fareEstimate: 180, fareFinal: 180,
            distanceKm: 6.2, durationMin: 18,
            paymentMethod: 'cash', paymentStatus: 'completed', completedAt: new Date(),
        },
    });

    await prisma.ride.create({
        data: {
            riderId: rider.id, vehicleType: 'car',
            pickupLat: 31.523, pickupLng: 74.355, pickupAddress: 'Model Town, Lahore',
            dropoffLat: 31.496, dropoffLng: 74.394, dropoffAddress: 'Johar Town, Lahore',
            status: 'completed', fareEstimate: 320, fareFinal: 320,
            distanceKm: 9.1, durationMin: 28,
            paymentMethod: 'cash', paymentStatus: 'completed', completedAt: new Date(),
        },
    });
    console.log('✅ 2 demo rides created');

    // 6. Demo Order
    await prisma.order.create({
        data: {
            customerId: rider.id, merchantId: merchantProfile.id,
            subtotal: 420, deliveryFee: 100, total: 520,
            paymentMethod: 'cash', paymentStatus: 'completed',
            deliveryAddress: 'DHA Phase 4, Lahore', deliveryLat: 31.48, deliveryLng: 74.40,
            status: 'delivered',
            items: {
                create: [
                    { menuItemId: 'mi-001', quantity: 1, unitPrice: 340, totalPrice: 340 },
                    { menuItemId: 'mi-005', quantity: 1, unitPrice: 80, totalPrice: 80 },
                ],
            },
        },
    });
    console.log('✅ Demo order created');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Demo Login Credentials:');
    console.log('   👤 Rider:    03001111111 / pass123  → /rider');
    console.log('   🚗 Driver:   03002222222 / pass123  → /driver');
    console.log('   🍔 Merchant: 03003333333 / pass123  → /merchant');
    console.log('   🛡️  Admin:    03004444444 / pass123  → /admin');
}

main()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error('SEED ERROR:', e.message); prisma.$disconnect(); process.exit(1); });
