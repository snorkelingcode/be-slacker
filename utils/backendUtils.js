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
        if (!address) {
            throw new Error('Wallet address is required');
        }
    
        let formattedAddress = address.toLowerCase();
        if (!formattedAddress.startsWith('0x')) {
            formattedAddress = '0x' + formattedAddress;
        }
    
        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!ethAddressRegex.test(formattedAddress)) {
            throw new Error('Invalid Ethereum wallet address');
        }
        
        return formattedAddress;
    }

    static validateUsername(username) {
        if (!username) throw new Error('Username is required');
        
        const trimmedUsername = username.trim();
        
        if (trimmedUsername.length < 3) throw new Error('Username must be at least 3 characters');
        if (trimmedUsername.length > 50) throw new Error('Username cannot exceed 50 characters');
        
        // Allow letters, numbers, underscores
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(trimmedUsername)) {
            throw new Error('Username can only contain letters, numbers, and underscores');
        }
        
        return trimmedUsername;
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
}

class BurnerAccountUtils {
    static generateBurnerAddress() {
        // Generate a cryptographically secure random Ethereum-like address
        const randomBytes = crypto.randomBytes(20);
        return '0x' + randomBytes.toString('hex');
    }

    static isBurnerAddress(address) {
        // Optional: Add specific validation for burner addresses if needed
        return address.toLowerCase().startsWith('0xburner');
    }
}

// Export all utility classes
module.exports = {
    ValidationUtils,
    ErrorUtils,
    BurnerAccountUtils
};