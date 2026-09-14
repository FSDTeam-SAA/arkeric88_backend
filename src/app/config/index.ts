import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

const aiBaseUrl = requiredEnv('AI_BASE_URL');

export default {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  isMongoEnabled: Boolean(process.env.MONGO_URI),
  bcryptSaltRounds: process.env.BCRYPT_SALT_ROUNDS,
  account_sid: process.env.TWILIO_ACCOUNT_SID,
  auth_token: process.env.TWILIO_AUTH_TOKEN,
  verify_service_sid: process.env.TWILIO_VERIFY_SERVICE_SID,
  jwt: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE,
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    accessTokenExpires: process.env.ACCESS_TOKEN_EXPIRES,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshTokenExpires: process.env.REFRESH_TOKEN_EXPIRES,
  },
  cloudinary: {
    name: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  email: {
    expires: process.env.EMAIL_EXPIRES,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    address: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    admin: process.env.ADMIN_EMAIL,
  },
  stripe: {
    publicKey: process.env.STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    paymentMethodConfig: process.env.STRIPE_PAYMENT_METHOD_CONFIG,
  },
  ai: {
    baseUrl: aiBaseUrl,
    suggestedCityUrl: joinUrl(aiBaseUrl, 'get_suggested_city'),
    tourPlanUrl: joinUrl(aiBaseUrl, 'get_tour_plan'),
    regenerateSuggestedCityUrl: joinUrl(aiBaseUrl, 'regenerate_suggested_city'),
    regenerateTourPlanUrl: joinUrl(aiBaseUrl, 'regenerate_tour_plan'),
    timeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS || 60000),
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    webhookBaseUrl: process.env.TWILIO_WEBHOOK_BASE_URL,
  },
  frontendUrl: process.env.FRONTEND_URL,
};
