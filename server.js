const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Track connected drivers and their locations
const driverLocations = new Map(); // driverId => { lat, lng, heading, speed }
const rideRooms = new Map();       // rideId => { riderId, driverId }

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    const io = new Server(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        transports: ['websocket', 'polling'],
    });

    // Expose io to Next.js API routes via global
    global._io = io;

    io.on('connection', (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // ---------- DRIVER EVENTS ----------
        socket.on('driver:go_online', ({ driverId, lat, lng }) => {
            socket.join(`driver:${driverId}`);
            driverLocations.set(driverId, { lat, lng, heading: 0, speed: 0, socketId: socket.id });
            socket.data.driverId = driverId;
            socket.data.role = 'driver';
            console.log(`[Driver] ${driverId} is online at ${lat},${lng}`);
        });

        socket.on('driver:location_update', ({ driverId, lat, lng, heading, speed }) => {
            driverLocations.set(driverId, { lat, lng, heading, speed, socketId: socket.id });
            // Broadcast to all rooms this driver is in (active rides)
            socket.rooms.forEach((room) => {
                if (room.startsWith('ride:') || room.startsWith('delivery:')) {
                    io.to(room).emit('driver:location', { driverId, lat, lng, heading, speed });
                }
            });
        });

        socket.on('driver:go_offline', ({ driverId }) => {
            driverLocations.delete(driverId);
            console.log(`[Driver] ${driverId} offline`);
        });

        socket.on('driver:accept_ride', ({ driverId, rideId, riderId }) => {
            socket.join(`ride:${rideId}`);
            rideRooms.set(rideId, { driverId, riderId });
            io.to(`rider:${riderId}`).emit('ride:accepted', { rideId, driverId });
            io.to(`ride:${rideId}`).emit('ride:status', { rideId, status: 'matched', driverId });
        });

        socket.on('driver:ride_status', ({ rideId, status, driverId }) => {
            io.to(`ride:${rideId}`).emit('ride:status', { rideId, status, driverId });
        });

        // ---------- RIDER EVENTS ----------
        socket.on('rider:subscribe', ({ riderId, rideId }) => {
            socket.join(`rider:${riderId}`);
            if (rideId) socket.join(`ride:${rideId}`);
            socket.data.riderId = riderId;
            socket.data.role = 'rider';
        });

        socket.on('rider:request_nearby', ({ lat, lng }) => {
            const nearby = [];
            driverLocations.forEach((loc, id) => {
                const dist = getDistance(lat, lng, loc.lat, loc.lng);
                if (dist < 5) nearby.push({ driverId: id, ...loc, distanceKm: dist });
            });
            socket.emit('nearby:drivers', nearby.slice(0, 10));
        });

        // ---------- DELIVERY ----------
        socket.on('delivery:subscribe', ({ customerId, deliveryId }) => {
            socket.join(`delivery:${deliveryId}`);
        });

        // ---------- ADMIN ----------
        socket.on('admin:subscribe', () => {
            socket.join('admin');
            socket.data.role = 'admin';
        });

        socket.on('admin:request_fleet', () => {
            const fleet = [];
            driverLocations.forEach((loc, id) => fleet.push({ driverId: id, ...loc }));
            socket.emit('admin:fleet', fleet);
        });

        // ---------- DISCONNECT ----------
        socket.on('disconnect', () => {
            if (socket.data.driverId) {
                driverLocations.delete(socket.data.driverId);
                io.to('admin').emit('driver:offline', { driverId: socket.data.driverId });
            }
            console.log(`[Socket] Disconnected: ${socket.id}`);
        });
    });

    // Broadcast fleet to admin every 5 seconds
    setInterval(() => {
        if (io.sockets.adapter.rooms.has('admin')) {
            const fleet = [];
            driverLocations.forEach((loc, id) => fleet.push({ driverId: id, ...loc }));
            io.to('admin').emit('admin:fleet', fleet);
        }
    }, 5000);

    httpServer
        .once('error', (err) => { console.error(err); process.exit(1); })
        .listen(port, () => {
            console.log(`\n🚀 Apni Services ready on http://${hostname}:${port}\n`);
        });
});

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function deg2rad(deg) { return deg * (Math.PI / 180); }
