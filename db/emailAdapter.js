const { dbOperations } = require('./utils');
const { generateOTP, setOTPExpiry, sendVerificationEmail } = require('../utils/emailService');

const emailAdapter = {
    async sendVerificationOTP(userId, email, name) {
        try {
            // Generate new OTP and expiry
            const otp = generateOTP();
            const expiry = setOTPExpiry();

            // Update user's OTP in database
            await dbOperations.updateUserOTP(userId, otp, expiry);

            // Send verification email
            const emailSent = await sendVerificationEmail(email, otp, name);
            if (!emailSent) {
                throw new Error('Failed to send verification email');
            }

            return true;
        } catch (error) {
            console.error('Error in sendVerificationOTP:', error);
            throw error;
        }
    },

    async verifyOTP(userId, enteredOTP) {
        try {
            // Get user from database
            const [user] = await dbOperations.executeQuery(
                'SELECT otp_code, otp_expiry FROM users WHERE id = $1',
                [userId]
            );

            if (!user || !user.otp_code || !user.otp_expiry) {
                return false;
            }

            // Check if OTP has expired
            if (new Date() > new Date(user.otp_expiry)) {
                return false;
            }

            // Check if OTP matches
            if (user.otp_code !== enteredOTP) {
                return false;
            }

            // Verify user and clear OTP
            await dbOperations.verifyUser(userId);
            return true;
        } catch (error) {
            console.error('Error in verifyOTP:', error);
            throw error;
        }
    }
};

module.exports = emailAdapter;