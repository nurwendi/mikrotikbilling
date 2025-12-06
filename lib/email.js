
import nodemailer from 'nodemailer';
import { getConfig } from './config';

function getTransporter() {
    const config = getConfig();
    const emailConfig = config.email || {};

    // Prioritize config.json, fallback to env
    const smtpHost = emailConfig.host || process.env.SMTP_HOST;
    const smtpPort = emailConfig.port || process.env.SMTP_PORT || 587;
    const smtpUser = emailConfig.user || process.env.SMTP_USER;
    const smtpPass = emailConfig.password || process.env.SMTP_PASS;
    const smtpSecure = emailConfig.secure !== undefined ? emailConfig.secure : (process.env.SMTP_SECURE === 'true');
    const smtpFrom = emailConfig.from || process.env.SMTP_FROM || smtpUser;
    const companyName = process.env.COMPANY_NAME || 'Internet Service Provider';

    if (!smtpHost || !smtpUser) {
        return null; // Not configured
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: smtpSecure,
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    return { transporter, from: `"${companyName}" <${smtpFrom}>`, companyName };
}

export async function sendInvoiceEmail(to, invoiceData) {
    const setup = getTransporter();
    if (!setup) {
        console.log(`Skipping email to ${to}: SMTP not configured (Check Settings > Email).`);
        return false;
    }
    const { transporter, from, companyName } = setup;

    const { invoiceNumber, customerName, month, year, amount, notes, invoiceId } = invoiceData;
    const period = new Date(year, month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0;">Tagihan Internet</h2>
                <p style="margin: 5px 0 0 0;">${companyName}</p>
            </div>
            
            <div style="padding: 20px;">
                <p>Halo <strong>${customerName}</strong>,</p>
                <p>Berikut adalah tagihan internet Anda untuk periode <strong>${period}</strong> telah terbit.</p>
                
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">No. Invoice</td>
                            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Periode</td>
                            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${period}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Keterangan</td>
                            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${notes || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 15px 0 0 0; border-top: 1px solid #e2e8f0; font-size: 1.1em;">Total Tagihan</td>
                            <td style="padding: 15px 0 0 0; border-top: 1px solid #e2e8f0; font-size: 1.2em; font-weight: bold; color: #dc2626; text-align: right;">${formattedAmount}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.APP_URL || '#'}/invoice/${invoiceId}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Lihat Invoice & Bayar</a>
                </div>

                <p style="font-size: 0.9em; color: #475569;">
                    Mohon segera lakukan pembayaran untuk menghindari gangguan layanan. Terima kasih atas kepercayaan Anda.
                </p>
            </div>
            
            <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 0.8em; color: #64748b;">
                <p style="margin: 0;">Pesan ini dikirim secara otomatis.</p>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from,
            to,
            subject: `Tagihan Internet ${period} - ${customerName}`,
            html,
        });
        console.log(`[Email] Invoice sent to ${to}`);
        return true;
    } catch (error) {
        console.error('[Email] Failed to send email:', error);
        return false;
    }
}

export async function sendPaymentReceiptEmail(to, paymentData, pdfBuffer) {
    const setup = getTransporter();
    if (!setup) {
        console.log(`Skipping email to ${to}: SMTP not configured (Check Settings > Email).`);
        return false;
    }
    const { transporter, from, companyName } = setup;

    const { invoiceNumber, customerName, amount, date } = paymentData;
    const paymentDate = new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0;">Pembayaran Berhasil</h2>
                <p style="margin: 5px 0 0 0;">${companyName}</p>
            </div>
            
            <div style="padding: 20px;">
                <p>Halo <strong>${customerName}</strong>,</p>
                <p>Terima kasih, pembayaran Anda telah kami terima.</p>
                
                <div style="background-color: #f0fdf4; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #bbf7d0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">No. Invoice</td>
                            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Tanggal Bayar</td>
                            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${paymentDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 15px 0 0 0; border-top: 1px solid #bbf7d0; font-size: 1.1em;">Jumlah Dibayar</td>
                            <td style="padding: 15px 0 0 0; border-top: 1px solid #bbf7d0; font-size: 1.2em; font-weight: bold; color: #16a34a; text-align: right;">${formattedAmount}</td>
                        </tr>
                    </table>
                </div>

                <p style="font-size: 0.9em; color: #475569;">
                    Bukti pembayaran (Invoice) telah dilampirkan dalam email ini.
                </p>
                
                <p style="font-size: 0.9em; color: #475569;">
                    Terima kasih telah menggunakan layanan kami.
                </p>
            </div>
            
            <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 0.8em; color: #64748b;">
                <p style="margin: 0;">Pesan ini dikirim secara otomatis.</p>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from,
            to,
            subject: `Bukti Pembayaran - ${invoiceNumber}`,
            html,
            attachments: [
                {
                    filename: `Invoice-${invoiceNumber.replace(/[\/\\:]/g, '-')}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });
        console.log(`[Email] Receipt sent to ${to}`);
        return true;
    } catch (error) {
        console.error('[Email] Failed to send receipt:', error);
        return false;
    }
}
