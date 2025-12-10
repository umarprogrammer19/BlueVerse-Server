import Invoice from "../models/invoice.models.js";
import Customer from "../models/customer.model.js";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import bwipjs from 'bwip-js';
import { fileURLToPath } from 'url';
import svgToImg from 'svg-to-img';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createInvoice = async (req, res) => {
    try {
        const { customer, serviceDetails, discounts, state, transactionId } = req.body;

        // Basic validation
        if (!customer || !serviceDetails || !serviceDetails.serviceName || !serviceDetails.price || !transactionId) {
            return res.status(400).json({ message: "Missing required invoice fields." });
        }

        // Check if customer exists
        const existingCustomer = await Customer.findById(customer);
        if (!existingCustomer) {
            return res.status(404).json({ message: "Customer not found." });
        }

        const newInvoice = new Invoice({
            customer,
            serviceDetails,
            discounts,
            state,
            transactionId,
        });

        await newInvoice.save();

        existingCustomer.invoiceCount = (existingCustomer.invoiceCount || 0) + 1;
        await existingCustomer.save();

        // Barcode generation using bwip-js
        let barcodePngBuffer;
        try {
            barcodePngBuffer = await bwipjs.toBuffer({
                bcid: 'code128', // Barcode type
                text: newInvoice.transactionId, // Data to encode
                scale: 3, // 3x scaling factor
                height: 10, // Bar height, in millimeters
                includetext: false, // Don't show human-readable text
                textxalign: 'center', // Always good to set this
            });
        } catch (err) {
            console.error("Error generating barcode:", err);
            return res.status(500).json({ message: "Error generating barcode." });
        }

        const barcodeBase64 = barcodePngBuffer.toString('base64');

        const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="190" height="47" viewBox="0 0 190 47" fill="none">
            <path d="M1.10596 17.1287C1.62762 15.6973 5.63279 5.36322 13.0309 3.05238C13.0309 3.05238 20.5325 0.452684 21.2051 6.21685C21.2051 6.21685 21.8777 10.9636 18.6313 15.374C18.6313 15.374 16.217 18.7842 20.8904 18.9092C21.2525 18.9179 22.9986 18.948 24.2316 19.2757C28.0859 20.3018 35.2512 23.8155 28.7153 35.3783C27.5384 37.5814 17.5707 53.3908 4.30061 38.0901C4.30061 38.0901 -0.515081 31.9853 0.0453838 22.4919C0.0453838 22.4919 0.157477 20.457 1.50259 20.7976C1.50259 20.7976 2.9598 30.9722 7.43922 33.9082C7.43922 33.9082 13.2637 38.5428 17.7432 31.3085C17.7432 31.3085 22.1105 25.4322 15.0572 23.2852C15.0572 23.2852 12.3713 22.4919 10.2415 22.4919C10.2415 22.4919 4.75329 22.1513 8.67224 16.4992C8.67224 16.4992 12.0221 10.9894 10.0562 10.3471C9.54743 10.1789 9.16372 10.2091 8.56015 10.5109C8.56015 10.5109 5.87422 11.7525 3.52027 16.9519C2.95549 18.3358 1.25254 19.4568 1.06716 17.646C1.05853 17.5469 1.07578 17.2322 1.11458 17.1244L1.10596 17.1287ZM23.8997 6.04009C24.3739 9.16576 22.8649 14.2056 27.9522 18.3531C28.6765 18.9437 30.6899 20.0733 31.5349 20.8493C33.9147 23.0308 37.3853 29.8987 27.3702 41.828C27.2064 42.0823 23.0029 46.9886 30.5088 46.6911C31.7289 46.6437 34.833 45.7469 36.2859 44.9407C41.1706 42.2289 51.5651 34.6454 49.3189 20.0129C48.8792 17.521 48.1549 15.305 46.314 11.981C44.1454 8.0707 40.9033 4.12589 36.8852 3.16878C45.7319 14.3565 45.844 26.454 39.6832 31.9896C39.4677 32.2138 39.5151 26.3936 36.1566 21.7029C36.1566 21.7029 33.1904 17.5771 34.195 12.2095C34.195 12.2052 35.7643 0 24.2273 0C23.2142 0.0862254 18.3898 0.0215562 20.8731 2.1427C21.3172 2.51778 23.5634 3.83703 23.8997 6.04009ZM6.77528 27.5706C7.2409 28.4458 7.72376 29.7176 8.57739 30.6187C9.07319 31.1446 9.73712 31.5326 10.7718 31.6016C11.9445 31.6792 13.5655 31.3516 13.7337 29.4201C13.7466 29.2563 13.7768 28.7217 13.5871 28.2259C13.3413 27.5878 12.7335 26.7471 11.315 26.4798C10.9012 26.4022 9.46982 26.3764 9.00421 26.2729C7.91777 26.0315 7.02964 25.4063 6.82701 24.3587C6.82701 24.3587 5.24478 24.8631 6.12859 26.5273C6.28811 26.829 6.60283 27.2429 6.77959 27.5706H6.77528Z" fill="url(#paint0_radial_40002130_3398)"/>
            <defs>
                <radialGradient id="paint0_radial_40002130_3398" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(22.0975 16.3958) scale(25.9711)">
                    <stop offset="0.48" stop-color="#7ED2F6"/>
                    <stop offset="0.96" stop-color="#0090D0"/>
                </radialGradient>
            </defs>
        </svg>`;

        const svgToPngBuffer = await sharp(Buffer.from(svgContent)).png().toBuffer()
        const pdfPath = path.join(__dirname, `invoice-${newInvoice._id}.pdf`);
        try {
            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);

            // Define colors based on original HTML design
            const primaryColor = '#1F62AE';
            const borderColor = '#ddd';
            const headerBgColor = '#f5f5f5';
            const totalBgColor = '#f0f0f0';

            // Add header with company logo area and styling
            doc.image(svgToPngBuffer, 50, 80, { width: 190, height: 47 });
            doc.fillColor('black');
            doc.fillColor('black').fontSize(14).moveDown(0.5);

            // Company information in header area
            doc.fontSize(16).fillColor(primaryColor).text('Blueverse Vehicle Washing LLC', 50, 100);
            doc.fillColor('black').fontSize(14);
            doc.text('Metropolis Towers #403 Business Bay, Dubai, UAE', 50, 120);
            doc.text('+971 544692205', 50, 140);
            doc.text('TRN: 104621245000003', 50, 160);

            // Right-aligned invoice details
            doc.fillColor('black').fontSize(14);
            doc.text(`Invoice #: BV-${newInvoice.transactionId}`, 400, 100, { align: 'right' });
            doc.text(`Transaction #: ${newInvoice.transactionId}`, 400, 120, { align: 'right' });
            doc.text(`Date: ${new Date().toLocaleDateString('en-US')}`, 400, 140, { align: 'right' });
            doc.text(`Time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, 400, 160, { align: 'right' });

            // Add a horizontal line separator
            doc.moveTo(50, 190).lineTo(550, 190).stroke('#eee');

            // Add customer info
            doc.fillColor('black').fontSize(12).moveDown(2);
            doc.text(`User: ${existingCustomer.firstName + " " + existingCustomer.lastName}`, 50, 210);

            // Add license info placeholder
            doc.text('License: 000025', 50, 230);

            // Transaction ID as barcode placeholder
            doc.text(`Transaction ID: ${newInvoice.transactionId}`, 400, 210, { align: 'right' });

            // Add table headers with background
            let yPosition = 270;

            // Invoice items table header
            doc.rect(50, yPosition, 500, 30).fill(headerBgColor);
            doc.fillColor('black').fontSize(12).text('Description', 60, yPosition + 8);
            doc.text('Amount', 480, yPosition + 8, { align: 'right' });

            yPosition += 35;

            // Add service details row
            doc.fillColor('black').fontSize(12);
            doc.text(newInvoice.serviceDetails.serviceName, 60, yPosition);
            doc.text(newInvoice.serviceDetails.price.toFixed(2), 480, yPosition, { align: 'right' });
            yPosition += 25;

            // Add discounts row
            doc.text('Discounts', 60, yPosition);
            doc.text(`-${newInvoice.discounts.toFixed(2)}`, 480, yPosition, { align: 'right' });
            yPosition += 25;

            // Add subtotal row
            doc.text('Subtotal', 60, yPosition);
            doc.text(newInvoice.subtotal.toFixed(2), 480, yPosition, { align: 'right' });
            yPosition += 25;

            // Add tax row
            doc.text(`Tax Rate (${(newInvoice.taxRate * 100).toFixed(0)}%)`, 60, yPosition);
            doc.text(newInvoice.taxAmount.toFixed(2), 480, yPosition, { align: 'right' });
            yPosition += 35;

            // Add total line with background
            doc.rect(50, yPosition, 500, 35).fill(totalBgColor);
            doc.fillColor(primaryColor).fontSize(14).text('Total', 60, yPosition + 10);
            // Add currency symbol
            // doc.fontSize(16).text('AED', 400, yPosition + 8, { align: 'right' });
            doc.fontSize(14).text(`AED ${newInvoice.total.toFixed(2)}`, 480, yPosition + 10, { align: 'right' });

            yPosition += 60;

            // Add footer with company message
            doc.fillColor('black').fontSize(10);
            doc.text('Thanks for letting Blueverse shine on your ride! We\'re grateful for your business and can\'t wait to welcome you back for another spotless wash. Drive safe and stay shiny!', 50, yPosition, {
                width: 500,
                align: 'center'
            });

            yPosition += 30;

            // Add privacy policy and terms links in footer
            doc.fontSize(9);
            doc.text('Privacy Policy | Terms and Conditions', 50, yPosition, {
                width: 500,
                align: 'center'
            });

            // Add border around the entire invoice
            doc.rect(45, 45, 510, yPosition + 50).stroke(borderColor);

            // End the document
            doc.end();

            // Wait for the PDF to finish writing
            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });
        } catch (err) {
            console.error("Error generating PDF:", err);
            return res.status(500).json({ message: "Error generating invoice PDF." });
        }

        let transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: [existingCustomer.email, process.env.SMTP_USER],
            subject: `Invoice from BlueVerse - #${newInvoice._id}`,
            html: "Please find your invoice attached.",
            attachments: [
                {
                    filename: `invoice-${newInvoice._id}.pdf`,
                    path: pdfPath,
                    contentType: "application/pdf",
                },
            ],
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).json({ message: "Error sending invoice email." });
            } else {
                console.log("Email sent:", info.response);
                fs.unlink(pdfPath, (unlinkErr) => {
                    if (unlinkErr) console.error("Error deleting PDF:", unlinkErr);
                });
                res.status(201).json({ message: "Invoice created and sent successfully!", invoice: newInvoice });
            }
        });
    } catch (error) {
        console.error("Error creating invoice:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
