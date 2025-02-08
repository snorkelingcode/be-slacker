// utils/backendUtils.js
const crypto = require('crypto');
const validator = require('validator');

class ValidationUtils {
    static sanitizeInput(input, maxLength = 1000) {
        if (!input) return '';
        return validator.escape(
            validator.trim(input.substring(0, maxLength))
        );
    }

    static validateWalletAddress(address) {
        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!ethAddressRegex.test(address)) {
            throw new Error('Invalid Ethereum wallet address');
        }
        return address.toLowerCase();
    }

    static validateUsername(username) {
        if (!username) throw new Error('Username is required');
        if (username.length < 3) throw new Error('Username must be at least 3 characters');
        if (username.length > 50) throw new Error('Username cannot exceed 50 characters');
        
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            throw new Error('Username can only contain letters, numbers, and underscores');
        }
        
        return username;
    }
}

class SecurityUtils {
    static generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    static hashData(data, salt = '') {
        return crypto
            .createHash('sha256')
            .update(data + salt)
            .digest('hex');
    }

    static createNonce() {
        return Math.floor(Math.random() * 1000000).toString();
    }
}

class MediaUtils {
    static validateFileSize(file, maxSizeMB = 5) {
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            throw new Error(`File size must not exceed ${maxSizeMB}MB`);
        }
    }

    static validateMediaType(file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) {
        if (!allowedTypes.includes(file.mimetype)) {
            throw new Error('Unsupported file type');
        }
    }
}

class ErrorUtils {
    static formatError(error, includeStack = false) {
        const errorResponse = {
            message: error.message,
            ...(includeStack && process.env.NODE_ENV === 'development' && { stack: error.stack })
        };
        
        console.error('Error:', errorResponse);
        
        return errorResponse;
    }

    static handleDuplicateKeyError(error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return `${field} already exists`;
        }
        return error.message;
    }
}

class RateLimiter {
    constructor(maxRequests = 100, timeWindow = 15 * 60 * 1000) {
        this.requestLog = new Map();
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
    }

    shouldAllow(key) {
        const now = Date.now();
        const requests = this.requestLog.get(key) || [];
        
        const recentRequests = requests.filter(time => now - time < this.timeWindow);
        
        if (recentRequests.length >= this.maxRequests) {
            throw new Error('Too many requests. Please try again later.');
        }
        
        recentRequests.push(now);
        this.requestLog.set(key, recentRequests);
        
        return true;
    }
}

module.exports = {
    ValidationUtils,
    SecurityUtils,
    MediaUtils,
    ErrorUtils,
    RateLimiter
};