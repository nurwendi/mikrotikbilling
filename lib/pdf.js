import PDFDocument from 'pdfkit';

/**
 * Generates a PDF Invoice/Receipt
 * @param {Object} paymentData - Payment details (invoiceNumber, amount, date, etc.)
 * @param {Object} customerData - Customer details (name, address, etc.)
 * @returns {Promise<Buffer>} - Resolves with PDF Buffer
 */
export function generateInvoicePDF(paymentData, customerData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Company Info (Header)
            const companyName = process.env.COMPANY_NAME || 'Internet Service Provider';
            doc.fontSize(20).text(companyName, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text('PAYMENT RECEIPT / BUKTI PEMBAYARAN', { align: 'center' });
            doc.moveDown();

            // Divider
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();

            // Customer & Invoice Details
            const startY = doc.y;

            // Left Column (Customer)
            doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, startY);
            doc.font('Helvetica').text(customerData.name || 'N/A');
            if (customerData.address) doc.text(customerData.address);
            if (customerData.id) doc.text(`ID: ${customerData.id}`);

            // Right Column (Invoice Info)
            const rightX = 350;
            doc.font('Helvetica-Bold').text('Invoice Details:', rightX, startY);
            doc.font('Helvetica');
            doc.text(`Invoice #: ${paymentData.invoiceNumber}`, rightX);
            const paymentDate = new Date(paymentData.date).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
            doc.text(`Date: ${paymentDate}`, rightX);
            doc.text(`Status: PAID`, rightX);

            doc.moveDown(4);

            // Table Header
            const tableTop = doc.y;
            doc.font('Helvetica-Bold');
            doc.text('Description', 50, tableTop);
            doc.text('Amount (IDR)', 400, tableTop, { width: 150, align: 'right' });

            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
            doc.font('Helvetica');

            // Table Row: Internet Service
            const rowTop = tableTop + 25;
            const period = new Date(paymentData.year, paymentData.month || 0).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            doc.text(`Internet Service - ${period}`, 50, rowTop);

            const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(paymentData.amount);
            doc.text(formattedAmount, 400, rowTop, { width: 150, align: 'right' });

            // Table Footer (Total)
            const totalTop = rowTop + 30;
            doc.moveTo(50, totalTop).lineTo(550, totalTop).stroke();

            doc.font('Helvetica-Bold');
            doc.text('TOTAL', 300, totalTop + 10, { width: 100, align: 'right' });
            doc.text(formattedAmount, 400, totalTop + 10, { width: 150, align: 'right' });

            // Footer / Notes
            doc.moveDown(4);
            doc.fontSize(10).font('Helvetica-Oblique').text('Thank you for your business!', { align: 'center' });
            if (process.env.APP_URL) {
                doc.text(process.env.APP_URL, { align: 'center', link: process.env.APP_URL });
            }

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}
