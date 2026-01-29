// Helper to format currency
const formatPrice = (amount: any) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(amount) || 0);
};

// Common head styles for forcing light mode
const emailHead = `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <style>
    :root {
      color-scheme: light;
    }
    body {
      background-color: #f3f4f6 !important;
      color: #111111 !important;
    }
    .email-container {
      background-color: #ffffff !important;
      color: #111111 !important;
    }
    /* Force light mode on Outlook/Gmail */
    [data-ogsc] .email-container { background-color: #ffffff !important; color: #111111 !important; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #f3f4f6 !important; }
      .email-container { background-color: #ffffff !important; color: #111111 !important; }
      h1, h2, h3, p, span, div { color: inherit !important; }
    }
  </style>
`;

export const getOrderConfirmationTemplate = (order: any) => {
  const itemsList = order.items.map((item: any) => {
    // Logic: Prefer saved unit_price, fallback to product price
    const price = Number(item.unit_price) || Number(item.product?.price) || 0;
    const total = price * (item.quantity || 1);
    const productName = item.product_name || item.product?.name || 'Prodotto';
    const image = item.product?.image?.url ? `<img src="${item.product.image.url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; margin-right: 12px; vertical-align: middle;">` : '';

    return `
        <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 16px 0; vertical-align: middle;">
                <table cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        ${image ? `<td style="padding-right: 12px;">${image}</td>` : ''}
                        <td>
                            <div style="font-weight: 600; color: #111111; font-size: 14px; line-height: 1.4;">${productName}</div>
                            <div style="font-size: 13px; color: #666666; margin-top: 2px;">Qt: ${item.quantity}</div>
                        </td>
                    </tr>
                </table>
            </td>
            <td style="padding: 16px 0; text-align: right; white-space: nowrap; font-weight: 600; color: #111111; vertical-align: middle;">
                ${formatPrice(total)}
            </td>
        </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      ${emailHead}
      <title>Conferma Ordine BrinMalte</title>
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
      <div class="email-container" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
        
        <!-- Header -->
        <div style="background-color: #000000; padding: 25px; text-align: center;">
            <h1 style="color: #ED8900; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">BrinMalte</h1>
        </div>

        <!-- Success Message -->
        <div style="padding: 40px 30px; text-align: center; border-bottom: 1px solid #f0f0f0; background-color: #ffffff;">
          <!-- Improved Icon: White Check on Orange BG -->
          <div style="width: 56px; height: 56px; background-color: #ED8900; border-radius: 50%; margin: 0 auto 20px; line-height: 56px; text-align: center;">
            <span style="font-size: 28px; color: #ffffff; line-height: 56px; display: block;">✓</span>
          </div>
          <h2 style="margin: 0 0 10px; color: #111111; font-size: 24px; font-weight: 600;">Grazie per il tuo ordine!</h2>
          <p style="margin: 0; color: #4b5563; font-size: 16px;">Il pagamento è stato confermato.</p>
          <p style="margin-top: 6px; color: #6b7280; font-size: 14px;">Ordine <strong style="color: #111;">#${order.order_number}</strong></p>
        </div>
        
        <!-- Order Details -->
        <div style="padding: 30px; background-color: #ffffff;">
          <h3 style="margin-top: 0; color: #111111; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ED8900; padding-bottom: 10px; display: inline-block;">Riepilogo Materiali</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            ${itemsList}
          </table>

          <div style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 16px; color: #4b5563;">Totale Pagato</span>
            <span style="font-size: 22px; font-weight: 700; color: #ED8900;">${formatPrice(order.total)}</span>
          </div>
        </div>

        <!-- Shipping Info -->
        <div style="background-color: #fafafa; padding: 30px; border-top: 1px solid #eee;">
          <h3 style="margin-top: 0; color: #111111; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Indirizzo di Spedizione</h3>
          <p style="color: #4b5563; line-height: 1.6; margin: 12px 0 0; font-size: 15px;">
              <strong style="color: #111;">${order.customer_name || 'Cliente'}</strong><br>
              ${order.shipping_address?.line1 || ''}<br>
              ${order.shipping_address?.postal_code || ''} ${order.shipping_address?.city || ''}<br>
              ${order.shipping_address?.country || ''}
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #111111; color: #888888; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">BrinMalte - Edilizia Professionale</p>
          <p style="margin: 5px 0 0;">Hai bisogno di assistenza? Rispondi a questa email.</p>
        </div>
      </div>
    </body>
    </html>
    `;
};

export const getOrderShippedTemplate = (order: any) => {
  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      ${emailHead}
      <title>Ordine Spedito - BrinMalte</title>
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
      <div class="email-container" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
        
        <!-- Header -->
        <div style="background-color: #000000; padding: 25px; text-align: center;">
            <h1 style="color: #ED8900; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">BrinMalte</h1>
        </div>

        <!-- Message -->
        <div style="padding: 40px 30px; text-align: center; background-color: #ffffff;">
          <div style="width: 56px; height: 56px; background-color: #10B981; border-radius: 50%; margin: 0 auto 20px; line-height: 56px; text-align: center;">
            <span style="font-size: 28px; line-height: 56px; display: block;">🚚</span>
          </div>
          <h2 style="margin: 0 0 10px; color: #111111; font-size: 24px; font-weight: 600;">Il tuo ordine è in viaggio!</h2>
          <p style="margin: 0 auto; color: #4b5563; font-size: 16px; max-width: 400px; line-height: 1.6;">
            Il corriere ha preso in carico la tua spedizione. I materiali sono in arrivo.
          </p>
        </div>
        
        <!-- Action Button -->
        <div style="text-align: center; padding-bottom: 40px; background-color: #ffffff;">
            <a href="${process.env.FRONTEND_URL}/profile" 
               style="background-color: #ED8900; color: #ffffff; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(237, 137, 0, 0.2);">
               Traccia la spedizione
            </a>
        </div>

        <!-- Footer -->
        <div style="background-color: #111111; color: #888888; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">BrinMalte - Edilizia Professionale</p>
        </div>
      </div>
    </body>
    </html>
    `;
};

export const getEmailConfirmationTemplate = (confirmationUrl: string) => {
  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      ${emailHead}
      <title>Conferma Account - BrinMalte</title>
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
      <div class="email-container" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
        
        <!-- Header -->
        <div style="background-color: #000000; padding: 25px; text-align: center;">
            <h1 style="color: #ED8900; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">BrinMalte</h1>
        </div>

        <!-- Message -->
        <div style="padding: 40px 30px; text-align: center; background-color: #ffffff;">
          <h2 style="margin: 0 0 15px; color: #111111; font-size: 24px; font-weight: 600;">Benvenuto in BrinMalte!</h2>
          <p style="margin: 0 auto; color: #4b5563; font-size: 16px; max-width: 400px; line-height: 1.6;">
            Grazie per la registrazione. Conferma il tuo indirizzo email per accedere al catalogo e ai tuoi ordini.
          </p>
          
          <div style="margin-top: 30px;">
            <a href="${confirmationUrl}" 
               style="background-color: #ED8900; color: #ffffff; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(237, 137, 0, 0.2);">
               Conferma Account
            </a>
          </div>
          
          <p style="margin-top: 30px; color: #9ca3af; font-size: 13px;">
            O incolla questo link: <br>
            <a href="${confirmationUrl}" style="color: #ED8900; text-decoration: none;">${confirmationUrl}</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #111111; color: #888888; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">BrinMalte - Edilizia Professionale</p>
        </div>
      </div>
    </body>
    </html>
    `;
};
