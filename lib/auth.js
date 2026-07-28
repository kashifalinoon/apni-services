import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'apni-services-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function hashPassword(password) {
    return bcrypt.hashSync(password, 12);
}

export function comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

export function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

export function getTokenFromRequest(request) {
    // Try Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    // Try cookie
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
        const match = cookieHeader.match(/token=([^;]+)/);
        if (match) return match[1];
    }
    return null;
}

export function authenticate(request) {
    const token = getTokenFromRequest(request);
    if (!token) return null;
    return verifyToken(token);
}

export function requireRole(...roles) {
    return (user) => {
        if (!user) return { error: 'Unauthorized', status: 401 };
        if (roles.length && !roles.includes(user.role)) {
            return { error: 'Forbidden', status: 403 };
        }
        return null;
    };
}

export function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
