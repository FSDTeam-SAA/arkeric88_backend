// ─── Build HTML email template ────────────────────────────────────────────
export const buildEmailHtml = (
  name: string,
  message: string,
  attachmentUrl?: string,
): string => {
  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>YOLO HEAT</title>
        <style>
          body { margin: 0; padding: 0; background: #f3f5f8; font-family: Arial, sans-serif; }
          .wrapper { max-width: 620px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #dde5ee; box-shadow: 0 8px 24px rgba(17, 46, 82, 0.08); }
          .brand { background: #e8ff00; padding: 18px 28px; color: #102f52; font-size: 14px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; }
          .header { background: #dfe7ef; padding: 28px 32px; border-bottom: 4px solid #e8ff00; }
          .header h1 { color: #102f52; margin: 0; font-size: 28px; line-height: 1.2; font-weight: 800; }
          .header p { color: #354a60; margin: 10px 0 0; font-size: 15px; line-height: 1.6; }
          .body { padding: 28px 32px 32px; color: #102f52; }
          .message-card { background: #f7f9fb; border: 1px solid #dde5ee; border-radius: 10px; padding: 22px; }
          .greeting { color: #102f52; font-size: 18px; font-weight: 800; margin-bottom: 14px; }
          .message { color: #354a60; font-size: 15px; line-height: 1.7; white-space: pre-line; }
          .attachment { margin-top: 24px; text-align: center; }
          .attachment img { max-width: 100%; border-radius: 10px; border: 1px solid #dde5ee; }
          .footer { background: #102f52; padding: 18px 32px; text-align: center; font-size: 12px; color: #dfe7ef; }
          .footer strong { color: #e8ff00; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="brand">YOLO HEAT</div>
          <div class="header">
            <h1>YOLO HEAT</h1>
            <p>Heating and installation specialists</p>
          </div>
          <div class="body">
            <div class="message-card">
              <div class="greeting">Hello, ${name}!</div>
              <div class="message">${message}</div>
              ${
                attachmentUrl
                  ? `<div class="attachment">
                      <img src="${attachmentUrl}" alt="Attachment" />
                    </div>`
                  : ''
              }
            </div>
          </div>
          <div class="footer">
            <p>You are receiving this because you requested a quote from YOLO HEAT.</p>
            <p>&copy; ${new Date().getFullYear()} <strong>YOLO HEAT</strong>. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

// mailer/templates.js
// Drop-in Nodemailer HTML templates for YOLO HEAT
// Usage: import { teamEmail, customerEmail } from './mailer/templates.js'

function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const BASE = `
  body{margin:0;padding:0;background:#f0f0f0;font-family:'Segoe UI',Arial,sans-serif}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #ddd}
  .header{background:#E8FF00;padding:20px 24px;display:flex;align-items:center;justify-content:space-between}
  .logo{font-size:15px;font-weight:800;letter-spacing:.1em;color:#1A2B3C}
  .badge{background:#1A2B3C;color:#E8FF00;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px}
  .accent{height:4px;background:#1E7A5C}
  .body{padding:28px 24px 20px}
  h2{font-size:18px;font-weight:700;color:#1A2B3C;margin:0 0 10px}
  p{font-size:14px;color:#555;line-height:1.6;margin:0 0 16px}
  .summary{border-left:3px solid #1E7A5C;border-radius:0 8px 8px 0;background:#f7f7f7;padding:14px 16px;margin:0 0 20px}
  .row{display:flex;justify-content:space-between;font-size:13px;padding:7px 0;border-bottom:1px solid #eee}
  .row:last-child{border-bottom:none}
  .rl{color:#888}.rv{color:#1A2B3C;font-weight:600}
  .urgent{background:#fff8e1;border:1.5px solid #E8FF00;border-radius:8px;padding:10px 14px;font-size:13px;color:#1A2B3C;font-weight:600;margin-bottom:18px}
  .hours{background:#E8FF00;border-radius:8px;padding:10px 14px;font-size:12px;color:#1A2B3C;font-weight:700;margin:0 0 16px}
  .cta{text-align:center;margin:20px 0 6px}
  .btn-yellow{display:inline-block;background:#E8FF00;color:#1A2B3C;text-decoration:none;padding:12px 30px;border-radius:8px;font-weight:800;font-size:14px}
  .btn-green{display:inline-block;background:#1E7A5C;color:#fff;text-decoration:none;padding:12px 30px;border-radius:8px;font-weight:700;font-size:14px}
  .btn-outline{display:inline-block;background:transparent;color:#1E7A5C;text-decoration:none;padding:11px 30px;border-radius:8px;font-weight:700;font-size:14px;border:1.5px solid #1E7A5C}
  .divider{height:1px;background:#f0f0f0;margin:16px 0}
  .footer{background:#1A2B3C;padding:14px 24px;text-align:center}
  .footer p{font-size:11px;color:#8899aa;margin:0}
  .footer span{color:#E8FF00;font-weight:700}
`;

// ─── Team notification email ─────────────────────────────────
function teamEmail({
  name,
  phone,
  reason,
  notes,
  mode,
  companyEmail,
  teamEmail: to,
}) {
  const modeLabel =
    mode === 'callback' ? 'Callback request' : 'Live chat request';
  const icon = mode === 'callback' ? '📞' : '💬';
  const submitted = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London',
  });

  return {
    from: `"YOLO HEAT Website" <${companyEmail}>`,
    to,
    subject: `[${modeLabel}] ${name} – ${reason}`,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>${BASE}</style></head><body>
<div class="wrap">
  <div class="header">
    <span class="logo">YOLO HEAT</span>
    <span class="badge">${icon} ${modeLabel}</span>
  </div>
  <div class="accent"></div>
  <div class="body">
    <div class="urgent">⚡ New customer request — respond as soon as possible</div>
    <h2>New ${modeLabel.toLowerCase()}</h2>
    <p>A customer has submitted a ${modeLabel.toLowerCase()} via the website. Please contact them within 1 hour.</p>
    <div class="summary">
      <div class="row"><span class="rl">Name</span><span class="rv">${escHtml(name)}</span></div>
      <div class="row"><span class="rl">Phone</span><span class="rv"><a href="tel:${escHtml(phone)}" style="color:#1E7A5C">${escHtml(phone)}</a></span></div>
      <div class="row"><span class="rl">Reason</span><span class="rv">${escHtml(reason)}</span></div>
      ${notes ? `<div class="row"><span class="rl">Notes</span><span class="rv" style="color:#555;font-weight:400">${escHtml(notes)}</span></div>` : ''}
      <div class="row"><span class="rl">Submitted</span><span class="rv" style="color:#888;font-weight:400">${submitted}</span></div>
    </div>
    <div class="cta">
      <a href="tel:${escHtml(phone)}" class="btn-yellow">📞&nbsp; Call ${escHtml(name)} now</a>
    </div>
  </div>
  <div class="footer"><p>Automated notification &nbsp;·&nbsp; <span>YOLO HEAT</span> &nbsp;·&nbsp; Do not reply</p></div>
</div>
</body></html>`,
  };
}

// ─── Customer confirmation email ─────────────────────────────
function customerEmail({
  name,
  phone,
  reason,
  mode,
  email,
  companyEmail,
  companyPhone,
  website,
}) {
  const modeLabel =
    mode === 'callback' ? 'callback request' : 'live chat request';

  return {
    from: `"YOLO HEAT" <${companyEmail}>`,
    to: email,
    subject: `We've received your request – YOLO HEAT`,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>${BASE}</style></head><body>
<div class="wrap">
  <div class="header">
    <span class="logo">YOLO HEAT</span>
    <span class="badge">Request received</span>
  </div>
  <div class="accent"></div>
  <div class="body">
    <h2>Hi ${escHtml(name)}, we're on it!</h2>
    <p>Thanks for getting in touch. We've received your ${modeLabel} and our team will contact you <strong>as soon as possible</strong> — usually within 1 hour during office hours.</p>
    <div class="summary">
      <div class="row"><span class="rl">Name</span><span class="rv">${escHtml(name)}</span></div>
      <div class="row"><span class="rl">Phone</span><span class="rv">${escHtml(phone)}</span></div>
      <div class="row"><span class="rl">Reason</span><span class="rv">${escHtml(reason)}</span></div>
    </div>
    <div class="hours">🕐&nbsp; Office hours: Mon–Fri 8am–8pm &nbsp;|&nbsp; Sat &amp; Sun 9am–3pm</div>
    <p style="font-size:13px;color:#888">Need urgent help outside office hours? Call us on <a href="tel:${escHtml(companyPhone)}" style="color:#1E7A5C;font-weight:600">${escHtml(companyPhone)}</a>.</p>
    <div class="divider"></div>
    <div class="cta">
      <a href="${escHtml(website)}" class="btn-outline">Visit ${escHtml(website)}</a>
    </div>
  </div>
  <div class="footer"><p><span>YOLO HEAT</span> &nbsp;·&nbsp; Heating &amp; Installation Specialists</p></div>
</div>
</body></html>`,
  };
}

type FollowUpQuoteItem = {
  title?: string;
  price?: number;
  payablePrice?: number;
  images?: string[];
};

type FollowUpQuoteItems = {
  product?: FollowUpQuoteItem;
  controller?: FollowUpQuoteItem;
  extra?: FollowUpQuoteItem;
};

export const buildFollowUpEmail = (
  name: string,
  quoteTotal: number,
  isFinalReminder = false,
  items: FollowUpQuoteItems = {},
): string => {
  const money = (value: number) =>
    `£${Number(value || 0).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const heading = isFinalReminder
    ? 'Last reminder - your quote is ready'
    : 'Your quote is saved';

  const intro = isFinalReminder
    ? 'We noticed you have not completed your booking yet. Your boiler quote is still ready, and you can finish the booking whenever you are ready.'
    : 'Thanks for requesting your YOLO HEAT quote. We noticed the booking has not been completed yet, so we saved it for you.';
  const price = money(quoteTotal);
  const code = '';
  const bookingUrl =
    'https://arronwh-website.vercel.app/boilers/property-overview';
  const safeName = escHtml(name || 'there');
  const normalizeImage = (item?: FollowUpQuoteItem) =>
    Array.isArray(item?.images) ? item?.images.find(Boolean) : undefined;
  const selectedItems = [
    {
      label: 'Boiler',
      item: items.product,
      image: normalizeImage(items.product),
      price: items.product?.payablePrice ?? items.product?.price ?? 0,
    },
    {
      label: 'Controller',
      item: items.controller,
      image: normalizeImage(items.controller),
      price: items.controller?.price ?? 0,
    },
    {
      label: 'Extra',
      item: items.extra,
      image: normalizeImage(items.extra),
      price: items.extra?.price ?? 0,
    },
  ].filter(({ item, image }) => item?.title || image);
  const heroImage =
    selectedItems.find(({ label, image }) => label === 'Boiler' && image)
      ?.image || selectedItems.find(({ image }) => image)?.image;
  const productRows = selectedItems
    .map(({ label, item, image, price }, index) => {
      const safeTitle = escHtml(item?.title || label);
      const safeImage = image ? escHtml(image) : '';
      const textCell = `
        <td class="quote-row-copy" width="50%" valign="middle">
          <div class="quote-row-title">${safeTitle}</div>
          <div class="quote-row-subtitle">${label}</div>
          <div class="quote-row-price">${money(price)}</div>
        </td>
      `;
      const imageCell = `
        <td class="quote-row-image-cell" width="50%" valign="middle">
          ${
            safeImage
              ? `<img src="${safeImage}" alt="${safeTitle}" width="220" class="quote-row-image" />`
              : ''
          }
        </td>
      `;

      return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="quote-row">
          <tr>
            ${index % 2 === 0 ? textCell + imageCell : imageCell + textCell}
          </tr>
        </table>
        ${
          index < selectedItems.length - 1
            ? '<div class="quote-row-divider"></div>'
            : ''
        }
      `;
    })
    .join('');

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>YOLO HEAT</title>
    <style>
      body { margin: 0; padding: 0; background: #EAEBEC; font-family: Arial, sans-serif; }
      .wrapper { max-width: 620px; margin: 40px auto; background: #ffffff; overflow: hidden; border: 1px solid #d6d8da; }
      
      .brand { background: #EAEBEC; padding: 22px 30px; color: #1A2E1A; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
      .brand-meta { color: #4b5a4d; font-size: 12px; font-weight: 400; line-height: 1.6; margin-top: 6px; letter-spacing: 0; }
      
      .header { background: #FBFF26; padding: 26px 30px; }
      .header h1 { color: #1A2E1A; margin: 0; font-size: 26px; font-weight: 900; }
      .header p { display: none; }
      .header .subtitle { color: #243824; margin: 10px 0 0; font-size: 14px; line-height: 1.6; }

      .body { padding: 28px 30px 32px; color: #1A2E1A; }
      
      .message-card { background: #D0E7D5; border: 1px solid #b9d2bf; padding: 22px; }

      .greeting { font-size: 18px; font-weight: 800; margin-bottom: 16px; }

      .message { display: none; }
      .follow-message { font-size: 15px; line-height: 1.7; color: #263a26; }

      .total-box {
        background: #ffffff;
        border: 1px solid #b9d2bf;
        margin: 20px 0;
        padding: 16px;
      }

      .total-label {
        color: #617064;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .06em;
        text-transform: uppercase;
      }

      .total-value {
        color: #1A2E1A;
        font-size: 28px;
        font-weight: 900;
        margin-top: 6px;
      }

      .cta {
        display: none;
        margin-top: 20px;
        background: #1A2E1A;
        color: #ffffff !important;
        padding: 12px 20px;
        text-decoration: none;
        font-weight: 800;
      }

      .primary-cta {
        display: inline-block;
        margin-top: 20px;
        background: #1A2E1A;
        color: #ffffff !important;
        padding: 12px 20px;
        text-decoration: none;
        font-weight: 800;
      }

      .footer { background: #1A2E1A; padding: 18px 30px; text-align: center; font-size: 12px; color: #EAEBEC; }
      .footer strong { color: #FBFF26; }
      .wrapper { max-width: 600px; border: 0; background: #ffffff; }
      .brand { background: #ffffff; color: #0c0c0d; padding: 26px 48px; font-size: 34px; line-height: 1; letter-spacing: 0; }
      .brand-meta { display: none; }
      .header { background: #0c0c0d; padding: 34px 48px 28px; }
      .header h1 { color: #ffffff; font-size: 72px; line-height: .95; font-weight: 900; }
      .header .subtitle { color: #ffffff; margin-top: 18px; font-size: 30px; line-height: 1.2; }
      .hero-img { width: 100%; max-width: 504px; margin-top: 26px; border-radius: 24px; background: #ffffff; }
      .body { padding: 24px 48px; color: #0c0c0d; }
      .message-card { background: #ffffff; border: 0; padding: 0; }
      .greeting { color: #0c0c0d; font-size: 32px; line-height: 1.2; font-weight: 900; }
      .follow-message { color: #0c0c0d; font-size: 17px; line-height: 1.5; }
      .total-box { background: #f3f3f3; border: 0; border-radius: 24px; padding: 24px; }
      .total-label { color: #0c0c0d; font-size: 16px; letter-spacing: 0; text-transform: none; }
      .total-value { color: #0c0c0d; font-size: 44px; line-height: 1; }
      .primary-cta { background: #0c0c0d; color: #ffffff !important; border-radius: 999px; padding: 14px 34px; font-size: 18px; }
      .product-grid { margin: 24px -48px 0; background: #f5f2ec; }
      .quote-row { width: 100%; background: #f5f2ec; }
      .quote-row-copy { padding: 34px 22px; text-align: center; color: #0c0c0d; font-family: Arial, sans-serif; }
      .quote-row-title { font-size: 34px; line-height: 1.15; font-weight: 900; }
      .quote-row-subtitle { margin-top: 14px; font-size: 20px; line-height: 1.25; }
      .quote-row-price { margin-top: 8px; font-size: 13px; line-height: 1.25; }
      .quote-row-image-cell { padding: 18px 22px; text-align: center; }
      .quote-row-image { display: inline-block; width: 100%; max-width: 220px; height: auto; border: 0; }
      .quote-row-divider { height: 4px; line-height: 4px; background: #dedbd5; font-size: 0; }
      .footer { background: #0c0c0d; padding: 24px 48px 48px; color: #ffffff; }
      .footer strong { color: #ffffff; }
      @media only screen and (max-width: 480px) {
        .wrapper { width: 100% !important; margin: 0 auto !important; }
        .brand, .header, .body, .footer { padding-left: 6.667vw !important; padding-right: 6.667vw !important; }
        .brand { font-size: 9vw !important; }
        .header h1 { font-size: 16vw !important; }
        .header .subtitle { font-size: 7vw !important; }
        .product-grid { margin-left: -6.667vw !important; margin-right: -6.667vw !important; }
        .quote-row-copy, .quote-row-image-cell { display: block !important; width: 100% !important; padding-left: 6.667vw !important; padding-right: 6.667vw !important; }
        .quote-row-title { font-size: 9vw !important; }
        .quote-row-subtitle { font-size: 5vw !important; }
        .quote-row-image { max-width: 70% !important; }
      }
    </style>
  </head>

  <body>
    <div class="wrapper">
      
      <div class="brand">
        ■ YOLO HEAT
        <div class="brand-meta">London, United Kingdom · hello@yoloheat.co.uk</div>
      </div>

      <div class="header">
        <h1>${heading}</h1>
        <div class="subtitle">${isFinalReminder ? 'Last reminder. Complete your booking before your saved quote expires.' : 'We saved your selected package so you can come back and book in minutes.'}</div>
        ${
          heroImage
            ? `<img src="${escHtml(heroImage)}" alt="Selected boiler" width="504" class="hero-img" />`
            : ''
        }
        <p>Your quote is about to expire — don’t miss this.</p>
      </div>

      <div class="body">
        <div class="message-card">
          
          <div class="greeting">Hey ${safeName},</div>

          <div class="follow-message">
            ${intro}<br/><br/>
            This is the full price from the quote you filled out.
          </div>

          <div class="total-box">
            <div class="total-label">Full quote price</div>
            <div class="total-value">${money(quoteTotal)}</div>
          </div>

          ${
            productRows
              ? `<div class="product-grid">${productRows}</div>`
              : ''
          }

          <div class="follow-message">
            If you would like to continue, click below and complete your booking.
          </div>

          <a href="${bookingUrl}" class="primary-cta">Complete your booking</a>

          <div class="message">
            Your quotes expire <strong>tonight</strong>.<br/><br/>

            So, as a last attempt to secure your booking (and yes… help us hit our targets 🙄), 
            we’ve unlocked something special for you.<br/><br/>

            How does a <strong>FREE Hive Mini Smart Thermostat</strong> (worth up to 
            <span class="highlight">£${price}</span>) sound?<br/><br/>

            To lock in your price and claim your FREE gift, use code:<br/>
            <span class="highlight">${code}</span><br/><br/>

            We’ll add it to your installation — completely free.<br/>
          </div>

          <a href="https://arronwh-website.vercel.app/boilers/property-overview" class="cta">Complete your booking 👈</a>

        </div>
      </div>

      <div class="footer">
        <p>You are receiving this because you requested a quote from YOLO HEAT.</p>
        <p style="margin:12px 0;">
          <a href="https://www.facebook.com/Yoloheat" style="display:inline-block;text-decoration:none;">
            <img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png" alt="Facebook" width="28" height="28" style="display:inline-block;border:0;width:28px;height:28px;" />
          </a>
          &nbsp;&nbsp;
          <a href="https://www.instagram.com/yolo.heat" style="display:inline-block;text-decoration:none;">
            <img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png" alt="Instagram" width="28" height="28" style="display:inline-block;border:0;width:28px;height:28px;" />
          </a>
        </p>
        <p>&copy; ${new Date().getFullYear()} <strong>YOLO HEAT</strong>. All rights reserved.</p>
      </div>

    </div>
  </body>
  </html>
  `;
};

export const buildReferEmail = (
  name: string,
  referredBy?: string,
): string => {
  const safeName = escHtml(name || 'there');
  const safeReferredBy = escHtml(referredBy || 'someone you know');

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>YOLO HEAT</title>
    <style>
      body { margin: 0; padding: 0; background: #EAEBEC; font-family: Arial, sans-serif; }
      .wrapper { max-width: 620px; margin: 40px auto; background: #ffffff; overflow: hidden; border: 1px solid #d6d8da; }

      .brand { background: #EAEBEC; padding: 22px 30px; color: #1A2E1A; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
      .brand-meta { color: #4b5a4d; font-size: 12px; font-weight: 400; line-height: 1.6; margin-top: 6px; letter-spacing: 0; }

      .header { background: #FBFF26; padding: 26px 30px; }
      .header h1 { color: #1A2E1A; margin: 0; font-size: 26px; font-weight: 900; }
      .header .subtitle { color: #243824; margin: 10px 0 0; font-size: 14px; line-height: 1.6; }

      .body { padding: 28px 30px 32px; color: #1A2E1A; }

      .message-card { background: #D0E7D5; border: 1px solid #b9d2bf; padding: 22px; }

      .greeting { font-size: 18px; font-weight: 800; margin-bottom: 16px; }

      .refer-message { font-size: 15px; line-height: 1.7; color: #263a26; }

      .primary-cta {
        display: inline-block;
        margin-top: 20px;
        background: #1A2E1A;
        color: #ffffff !important;
        padding: 12px 20px;
        text-decoration: none;
        font-weight: 800;
      }

      .footer { background: #1A2E1A; padding: 18px 30px; text-align: center; font-size: 12px; color: #EAEBEC; }
      .footer strong { color: #FBFF26; }
    </style>
  </head>

  <body>
    <div class="wrapper">

      <div class="brand">
        ■ YOLO HEAT
        <div class="brand-meta">London, United Kingdom · hello@yoloheat.co.uk</div>
      </div>

      <div class="header">
        <h1>You have been referred to YOLO HEAT</h1>
        <div class="subtitle">Start your boiler quote whenever you are ready.</div>
      </div>

      <div class="body">
        <div class="message-card">

          <div class="greeting">Hey ${safeName},</div>

          <div class="refer-message">
            ${safeReferredBy} referred you to YOLO HEAT for your boiler installation.
            You can complete your quote online and see the options available for your home.
          </div>

          <a href="https://arronwh-website.vercel.app/boilers/property-overview" class="primary-cta">Complete your quote</a>

        </div>
      </div>

      <div class="footer">
        <p>You are receiving this because someone referred you to YOLO HEAT.</p>
        <p>&copy; ${new Date().getFullYear()} <strong>YOLO HEAT</strong>. All rights reserved.</p>
      </div>

    </div>
  </body>
  </html>
  `;
};

export { teamEmail, customerEmail };
