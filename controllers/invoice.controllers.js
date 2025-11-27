import Invoice from "../models/invoice.models.js";
import Customer from "../models/customer.model.js";
import nodemailer from "nodemailer";
import pdf from "html-pdf";
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

        // Check if customer exists (assuming Customer model)
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

        // Generate PDF
        const invoiceHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        color: #333;
                    }
                    .invoice-box {
                        max-width: 800px;
                        margin: auto;
                        padding: 30px;
                        border: 1px solid #eee;
                        box-shadow: 0 0 10px rgba(0, 0, 0, .15);
                        font-size: 16px;
                        line-height: 24px;
                        color: #555;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .header h1 {
                        font-size: 24px;
                        margin-bottom: 5px;
                    }
                    .header p {
                        margin: 0;
                    }
                    .barcode {
                        text-align: center;
                        margin: 20px 0;
                    }
                    .details-table {
                        width: 100%;
                        line-height: inherit;
                        text-align: left;
                        margin-bottom: 20px;
                    }
                    .details-table td {
                        padding: 5px;
                        vertical-align: top;
                    }
                    .details-table .label {
                        width: 150px;
                    }
                    .item-table {
                        width: 100%;
                        line-height: inherit;
                        text-align: left;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    .item-table th, .item-table td {
                        border-bottom: 1px dashed #eee;
                        padding: 8px;
                        vertical-align: top;
                    }
                    .item-table th {
                        background: #eee;
                    }
                    .total-row td {
                        border-top: 2px solid #eee;
                        font-weight: bold;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 14px;
                        color: #777;
                    }
                    .signature-line {
                        width: 200px;
                        border-bottom: 1px solid #333;
                        display: inline-block;
                        margin-left: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="header">
                        <div class="logo">
                            <img src="https://wheat-ferret-827560.hostingersite.com/wp-content/uploads/2025/10/image-5-1.png" alt="Company Logo" style="width: 190px; height: 49px;"/>
                        </div>
                        <p>Al Quoz</p>
                        <p>(555) 555-5555</p>
                    </div>

                    <div class="barcode">
                        <!-- Barcode will be inserted here -->
                        <img src="${barcodeDataUri}" alt="barcode" width="150" height="60"/>
                    </div>

                    <table class="details-table">
                        <tr>
                            <td class="label">Invoice #</td>
                            <td>${newInvoice._id}</td>
                            <td></td>
                            <td class="label">Transaction #</td>
                            <td>${newInvoice.transactionId}</td>
                        </tr>
                        <tr>
                            <td class="label">User</td>
                            <td>${existingCustomer.firstName + " " + existingCustomer.lastName}</td>
                        </tr>
                        <tr>
                            <td class="label">License</td>
                            <td>000025 <!-- Placeholder --></td>
                            <td></td>
                            <td class="label">Time</td>
                            <td>${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                        <tr>
                            <td class="label">Date</td>
                            <td>${new Date().toLocaleDateString('en-US')}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                    </table>

                    <table class="item-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${newInvoice.serviceDetails.serviceName}</td>
                                <td class="text-right">$${newInvoice.serviceDetails.price.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Discounts</td>
                                <td class="text-right">-$${newInvoice.discounts.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Subtotal</td>
                                <td class="text-right">$${newInvoice.subtotal.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Tax Rate (${(newInvoice.taxRate * 100).toFixed(0)}%)</td>
                                <td class="text-right">$${newInvoice.taxAmount.toFixed(2)}</td>
                            </tr>
                            <tr class="total-row">
                                <td>Total</td>
                                <td class="text-right">$${newInvoice.total.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </body>
            </html>
        `;

        const pdfPath = path.join(__dirname, `invoice-${newInvoice._id}.pdf`);
        pdf.create(invoiceHtml, {}).toFile(pdfPath, async (err) => {
            if (err) {
                console.error("Error generating PDF:", err);
                return res.status(500).json({ message: "Error generating invoice PDF." });
            }

            // Send email
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
                    // Delete the generated PDF after sending
                    fs.unlink(pdfPath, (unlinkErr) => {
                        if (unlinkErr) console.error("Error deleting PDF:", unlinkErr);
                    });
                    res.status(201).json({ message: "Invoice created and sent successfully!", invoice: newInvoice });
                }
            });
        });
    } catch (error) {
        console.error("Error creating invoice:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
