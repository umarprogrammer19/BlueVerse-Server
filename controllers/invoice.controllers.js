import Invoice from "../models/invoice.models.js";
import Customer from "../models/customer.model.js";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import bwipjs from 'bwip-js';
import { fileURLToPath } from 'url';

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
        const barcodeDataUri = `data:image/png;base64,${barcodeBase64}`;
        // Create PDF using PDFKit with enhanced styling to match original HTML format
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
            doc.fillColor('black');
            doc.fontSize(28).fillColor(primaryColor).text('INVOICE', 50, 50);
            
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
