type PasswordResetTemplateParams = {
  otp: string | number;
  expiryMinutes?: number;
};

type PaymentSuccessTemplateParams = {
  paymentId: string;
  amount: number;
  currency: string;
  description?: string;
  nameOnCard?: string;
  country?: string;
  zipCode?: string;
  paymentDate: string;
  paymentMethod?: string;
};

const brand = {
  name: 'VELARI',
  primary: '#626d5a',
  primaryDark: '#4f5949',
  cream: '#f5f0e8',
  panel: '#fbfaf7',
  gold: '#b48a45',
  ink: '#272a25',
  muted: '#6d7468',
  border: '#e7dfd3',
};

export const createForgotPasswordEmailTemplate = ({
  otp,
  expiryMinutes = 10,
}: PasswordResetTemplateParams) => {
  const otpCode = String(otp);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Password Reset</title>
  </head>
  <body style="margin:0;padding:0;background:${brand.cream};font-family:Arial,Helvetica,sans-serif;color:${brand.ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${brand.cream};margin:0;padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:${brand.panel};border:1px solid ${brand.border};border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(39,42,37,0.10);">
            <tr>
              <td style="background:${brand.primary};padding:34px 34px 30px;text-align:center;">
                <div style="display:inline-block;background:${brand.cream};border-radius:999px;padding:10px 18px;margin-bottom:18px;">
                  <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:4px;color:${brand.gold};font-weight:700;">${brand.name}</span>
                </div>
                <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.25;font-weight:700;">Reset your password</h1>
                <p style="margin:10px 0 0;color:#ece8df;font-size:15px;line-height:1.6;">Use the verification code below to continue securely.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 34px 10px;">
                <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;">Hello,</p>
                <p style="margin:0;color:${brand.muted};font-size:15px;line-height:1.8;">
                  We received a request to reset the password for your ${brand.name} account. Enter this one-time password in the app to verify your identity.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid ${brand.border};border-radius:14px;">
                  <tr>
                    <td align="center" style="padding:28px 20px;">
                      <p style="margin:0 0 12px;color:${brand.muted};font-size:13px;line-height:1;text-transform:uppercase;letter-spacing:1.6px;font-weight:700;">Your OTP Code</p>
                      <div style="display:inline-block;background:${brand.cream};border:1px solid ${brand.border};border-radius:12px;padding:16px 24px;">
                        <span style="font-size:34px;line-height:1;letter-spacing:8px;color:${brand.primaryDark};font-weight:800;">${otpCode}</span>
                      </div>
                      <p style="margin:16px 0 0;color:${brand.muted};font-size:14px;line-height:1.6;">This code expires in ${expiryMinutes} minutes.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8f6f1;border-left:4px solid ${brand.gold};border-radius:10px;">
                  <tr>
                    <td style="padding:18px 18px;">
                      <p style="margin:0;color:${brand.ink};font-size:14px;line-height:1.7;font-weight:700;">Didn’t request this?</p>
                      <p style="margin:6px 0 0;color:${brand.muted};font-size:14px;line-height:1.7;">
                        You can safely ignore this email. Your password will not change unless this code is verified.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;border-top:1px solid ${brand.border};padding:22px 34px;text-align:center;">
                <p style="margin:0;color:${brand.muted};font-size:12px;line-height:1.7;">For your security, never share this code with anyone.</p>
                <p style="margin:8px 0 0;color:${brand.primary};font-size:12px;line-height:1.7;font-weight:700;">${brand.name} Support Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const createPaymentSuccessEmailTemplate = ({
  paymentId,
  amount,
  currency,
  description,
  nameOnCard,
  country,
  zipCode,
  paymentDate,
  paymentMethod,
}: PaymentSuccessTemplateParams) => {
  const amountLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment Confirmation</title>
  </head>
  <body style="margin:0;padding:0;background:${brand.cream};font-family:Arial,Helvetica,sans-serif;color:${brand.ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${brand.cream};margin:0;padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:${brand.panel};border:1px solid ${brand.border};border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(39,42,37,0.10);">
            <tr>
              <td style="background:${brand.primary};padding:34px 34px 30px;text-align:center;">
                <div style="display:inline-block;background:${brand.cream};border-radius:999px;padding:10px 18px;margin-bottom:18px;">
                  <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:4px;color:${brand.gold};font-weight:700;">${brand.name}</span>
                </div>
                <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.25;font-weight:700;">Payment Received</h1>
                <p style="margin:10px 0 0;color:#ece8df;font-size:15px;line-height:1.6;">Thank you for your payment. Your transaction was completed successfully.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 34px 10px;">
                <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;">Hello,</p>
                <p style="margin:0;color:${brand.muted};font-size:15px;line-height:1.8;">
                  We have received your payment for ${brand.name}. Below are the details of your successful transaction.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid ${brand.border};border-radius:14px;">
                  <tr>
                    <td style="padding:24px 26px;">
                      <p style="margin:0 0 12px;color:${brand.muted};font-size:14px;line-height:1.8;font-weight:700;">Payment ID</p>
                      <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;word-break:break-all;">${paymentId}</p>

                      <p style="margin:0 0 12px;color:${brand.muted};font-size:14px;line-height:1.8;font-weight:700;">Amount</p>
                      <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;">${amountLabel}</p>

                      <p style="margin:0 0 12px;color:${brand.muted};font-size:14px;line-height:1.8;font-weight:700;">Date</p>
                      <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;">${paymentDate}</p>

                      <p style="margin:0 0 12px;color:${brand.muted};font-size:14px;line-height:1.8;font-weight:700;">Payment Method</p>
                      <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;">${paymentMethod ?? 'Card'}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8f6f1;border-left:4px solid ${brand.gold};border-radius:10px;">
                  <tr>
                    <td style="padding:18px 18px;">
                      <p style="margin:0;color:${brand.ink};font-size:14px;line-height:1.7;font-weight:700;">Transaction Details</p>
                      <p style="margin:10px 0 0;color:${brand.muted};font-size:14px;line-height:1.7;">Description: ${description ?? 'Not provided'}</p>
                      <p style="margin:6px 0 0;color:${brand.muted};font-size:14px;line-height:1.7;">Name on card: ${nameOnCard ?? 'N/A'}</p>
                      <p style="margin:6px 0 0;color:${brand.muted};font-size:14px;line-height:1.7;">Country: ${country ?? 'N/A'} • Postal code: ${zipCode ?? 'N/A'}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;border-top:1px solid ${brand.border};padding:22px 34px;text-align:center;">
                <p style="margin:0;color:${brand.muted};font-size:12px;line-height:1.7;">If you did not authorize this payment, contact our support team immediately.</p>
                <p style="margin:8px 0 0;color:${brand.primary};font-size:12px;line-height:1.7;font-weight:700;">${brand.name} Billing Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};
