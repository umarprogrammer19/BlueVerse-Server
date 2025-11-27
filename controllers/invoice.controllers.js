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
                        font-family: 'Roboto', sans-serif;
                        margin: 0;
                        padding: 20px;
                        color: #333;
                        background-color: #f9f9f9;
                    }
                    .invoice-box {
                        max-width: 800px;
                        margin: 30px auto;
                        padding: 40px;
                        border: 1px solid #ddd;
                        background-color: #fff;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, .08);
                        font-size: 14px;
                        line-height: 1.6;
                        color: #444;
                        border-radius: 8px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 10px;
                        border-bottom: 2px solid #eee;
                    }
                    .header h1 {
                        font-size: 28px;
                        color: #1F62AE;
                        margin-bottom: 8px;
                    }
                    .header p {
                        margin: 0;
                        font-size: 14px;
                        color: #555;
                    }
                    .barcode {
                        text-align: center;
                        margin: 20px 0 0 0;
                    }
                    .details-table {
                        width: 100%;
                        line-height: 1.8;
                        text-align: left;
                        margin-bottom: 25px;
                        border: 1px solid #eee;
                        border-radius: 5px;
                        overflow: hidden;
                    }
                    .details-table td {
                        padding: 10px 15px;
                        vertical-align: top;
                        border-bottom: 1px solid #eee;
                    }
                    .details-table tr:last-child td {
                        border-bottom: none;
                    }
                    .details-table .label {
                        width: 180px;
                        font-weight: bold;
                        color: #333;
                        background-color: #f5f5f5;
                    }
                    .item-table {
                        width: 100%;
                        line-height: inherit;
                        text-align: left;
                        border-collapse: collapse;
                        margin-bottom: 25px;
                        border: 1px solid #eee;
                        border-radius: 5px;
                        overflow: hidden;
                    }
                    .item-table th, .item-table td {
                        border-bottom: 1px solid #eee;
                        padding: 12px 15px;
                        vertical-align: top;
                    }
                    .item-table th {
                        background: #f5f5f5;
                        font-weight: bold;
                        color: #333;
                    }
                    .item-table tr:nth-child(even) {
                        background-color: #fcfcfc;
                    }
                    .item-table tr:last-child td {
                        border-bottom: none;
                    }
                    .total-row td {
                        border-top: 2px solid #ddd;
                        font-weight: bold;
                        font-size: 16px;
                        color: #1F62AE;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 13px;
                        color: #888;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                    }
                    .footer p {
                        margin: 5px 0;
                    }
                    .footer a {
                        color: #1F62AE;
                        text-decoration: none;
                    }
                    .footer a:hover {
                        text-decoration: underline;
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="190" height="47" viewBox="0 0 190 47" fill="none">
  <path d="M1.10596 17.1287C1.62762 15.6973 5.63279 5.36322 13.0309 3.05238C13.0309 3.05238 20.5325 0.452684 21.2051 6.21685C21.2051 6.21685 21.8777 10.9636 18.6313 15.374C18.6313 15.374 16.217 18.7842 20.8904 18.9092C21.2525 18.9179 22.9986 18.948 24.2316 19.2757C28.0859 20.3018 35.2512 23.8155 28.7153 35.3783C27.5384 37.5814 17.5707 53.3908 4.30061 38.0901C4.30061 38.0901 -0.515081 31.9853 0.0453838 22.4919C0.0453838 22.4919 0.157477 20.457 1.50259 20.7976C1.50259 20.7976 2.9598 30.9722 7.43922 33.9082C7.43922 33.9082 13.2637 38.5428 17.7432 31.3085C17.7432 31.3085 22.1105 25.4322 15.0572 23.2852C15.0572 23.2852 12.3713 22.4919 10.2415 22.4919C10.2415 22.4919 4.75329 22.1513 8.67224 16.4992C8.67224 16.4992 12.0221 10.9894 10.0562 10.3471C9.54743 10.1789 9.16372 10.2091 8.56015 10.5109C8.56015 10.5109 5.87422 11.7525 3.52027 16.9519C2.95549 18.3358 1.25254 19.4568 1.06716 17.646C1.05853 17.5469 1.07578 17.2322 1.11458 17.1244L1.10596 17.1287ZM23.8997 6.04009C24.3739 9.16576 22.8649 14.2056 27.9522 18.3531C28.6765 18.9437 30.6899 20.0733 31.5349 20.8493C33.9147 23.0308 37.3853 29.8987 27.3702 41.828C27.2064 42.0823 23.0029 46.9886 30.5088 46.6911C31.7289 46.6437 34.833 45.7469 36.2859 44.9407C41.1706 42.2289 51.5651 34.6454 49.3189 20.0129C48.8792 17.521 48.1549 15.305 46.314 11.981C44.1454 8.0707 40.9033 4.12589 36.8852 3.16878C45.7319 14.3565 45.844 26.454 39.6832 31.9896C39.4677 32.2138 39.5151 26.3936 36.1566 21.7029C36.1566 21.7029 33.1904 17.5771 34.195 12.2095C34.195 12.2052 35.7643 0 24.2273 0C23.2142 0.0862254 18.3898 0.0215562 20.8731 2.1427C21.3172 2.51778 23.5634 3.83703 23.8997 6.04009ZM6.77528 27.5706C7.2409 28.4458 7.72376 29.7176 8.57739 30.6187C9.07319 31.1446 9.73712 31.5326 10.7718 31.6016C11.9445 31.6792 13.5655 31.3516 13.7337 29.4201C13.7466 29.2563 13.7768 28.7217 13.5871 28.2259C13.3413 27.5878 12.7335 26.7471 11.315 26.4798C10.9012 26.4022 9.46982 26.3764 9.00421 26.2729C7.91777 26.0315 7.02964 25.4063 6.82701 24.3587C6.82701 24.3587 5.24478 24.8631 6.12859 26.5273C6.28811 26.829 6.60283 27.2429 6.77959 27.5706H6.77528Z" fill="url(#paint0_radial_40002130_3398)"/>
  <path d="M71.2028 32.3432H63.0588V14.3738H71.7892C73.9922 14.4083 75.5529 15.0463 76.4712 16.288C77.023 17.0511 77.299 17.9651 77.299 19.03C77.299 20.0948 77.023 21.0088 76.4712 21.6771C76.1608 22.0522 75.7081 22.3927 75.1045 22.7032C76.0228 23.0351 76.7169 23.5654 77.1826 24.2897C77.6482 25.014 77.8853 25.8892 77.8853 26.9239C77.8853 27.9586 77.618 28.9416 77.0791 29.7909C76.7385 30.3514 76.3117 30.8213 75.7986 31.205C75.2209 31.6447 74.5398 31.9465 73.7551 32.106C72.9705 32.2699 72.1211 32.3518 71.2028 32.3518V32.3432ZM72.9834 21.0045C73.4706 20.7113 73.7163 20.1897 73.7163 19.4309C73.7163 18.5945 73.393 18.0427 72.742 17.7711C72.1815 17.5857 71.4658 17.4908 70.5949 17.4908H66.6458V21.4529H71.0606C71.8495 21.4529 72.4919 21.302 72.9877 21.0002L72.9834 21.0045ZM71.1166 24.432H66.6415V29.2218H71.0562C71.8452 29.2218 72.4574 29.1183 72.8972 28.9028C73.6947 28.5148 74.0914 27.7646 74.0914 26.6609C74.0914 25.7254 73.7034 25.083 72.9316 24.7338C72.5005 24.5398 71.8969 24.4363 71.1166 24.4277V24.432Z" fill="#1F62AE"/>
  <path d="M81.5715 14.3738H85.0464V32.3432H81.5715V14.3738Z" fill="#1F62AE"/>
  <path d="M98.2044 30.4634C98.1699 30.5022 98.0923 30.6273 97.9587 30.8299C97.825 31.0325 97.6741 31.2136 97.4974 31.3645C96.9541 31.8517 96.4282 32.1836 95.9194 32.3647C95.4107 32.5415 94.8158 32.632 94.1346 32.632C92.1686 32.632 90.8408 31.925 90.1596 30.5109C89.7759 29.7305 89.5862 28.5794 89.5862 27.0619V19.0515H93.1473V27.0619C93.1473 27.8163 93.2378 28.3854 93.4146 28.7691C93.7336 29.446 94.3545 29.7823 95.2814 29.7823C96.467 29.7823 97.2818 29.3037 97.7216 28.3423C97.95 27.8206 98.0621 27.1351 98.0621 26.2815V19.0515H101.584V32.3388H98.2087V30.4634H98.2044Z" fill="#1F62AE"/>
  <path d="M117.558 28.4415C117.467 29.2304 117.057 30.0323 116.325 30.8428C115.186 32.1362 113.591 32.7829 111.543 32.7829C109.853 32.7829 108.362 32.2397 107.068 31.1489C105.775 30.0582 105.128 28.2863 105.128 25.8331C105.128 23.5352 105.71 21.7676 106.879 20.5432C108.047 19.3145 109.56 18.7023 111.418 18.7023C112.522 18.7023 113.518 18.9092 114.406 19.3231C115.29 19.737 116.023 20.3923 116.6 21.2848C117.122 22.0737 117.458 22.9877 117.614 24.0267C117.704 24.6346 117.739 25.5141 117.721 26.6609H108.625C108.672 27.9931 109.09 28.9286 109.879 29.4632C110.358 29.7952 110.935 29.9633 111.612 29.9633C112.328 29.9633 112.91 29.7607 113.354 29.3555C113.6 29.1356 113.811 28.8295 114.001 28.4415H117.549H117.558ZM114.121 24.3673C114.065 23.449 113.785 22.7506 113.285 22.2763C112.785 21.8021 112.164 21.565 111.427 21.565C110.621 21.565 110 21.815 109.556 22.3195C109.112 22.8239 108.836 23.5051 108.719 24.3673H114.121Z" fill="#1F62AE"/>
  <path d="M119.769 14.3738H123.779L127.68 28.0146L131.617 14.3738H135.518L129.388 32.3432H125.84L119.769 14.3738Z" fill="#1F62AE"/>
  <path d="M149.099 28.4415C149.009 29.2304 148.599 30.0323 147.866 30.8428C146.728 32.1362 145.133 32.7829 143.085 32.7829C141.395 32.7829 139.903 32.2397 138.61 31.1489C137.316 30.0582 136.67 28.2863 136.67 25.8331C136.67 23.5352 137.252 21.7676 138.42 20.5432C139.588 19.3145 141.102 18.7023 142.96 18.7023C144.064 18.7023 145.059 18.9092 145.948 19.3231C146.831 19.737 147.564 20.3923 148.142 21.2848C148.664 22.0737 149 22.9877 149.155 24.0267C149.246 24.6346 149.28 25.5141 149.263 26.6609H140.166C140.214 27.9931 140.632 28.9286 141.421 29.4632C141.899 29.7952 142.477 29.9633 143.154 29.9633C143.87 29.9633 144.452 29.7607 144.896 29.3555C145.141 29.1356 145.353 28.8295 145.542 28.4415H149.09H149.099ZM145.659 24.3673C145.603 23.449 145.322 22.7506 144.822 22.2763C144.322 21.8021 143.701 21.565 142.964 21.565C142.158 21.565 141.537 21.815 141.093 22.3195C140.649 22.8239 140.373 23.5051 140.257 24.3673H145.659Z" fill="#1F62AE"/>
  <path d="M159.541 22.2591C158.144 22.2591 157.204 22.7161 156.726 23.6258C156.458 24.1388 156.325 24.9278 156.325 25.9927V32.3432H152.824V19.0558H156.139V21.371C156.678 20.4872 157.144 19.8793 157.541 19.5559C158.192 19.0127 159.037 18.7411 160.076 18.7411C160.14 18.7411 160.196 18.7411 160.239 18.7454C160.282 18.7497 160.382 18.754 160.537 18.7627V22.3238C160.317 22.2979 160.123 22.285 159.951 22.2763C159.778 22.2677 159.64 22.2634 159.537 22.2634L159.541 22.2591Z" fill="#1F62AE"/>
  <path d="M172.479 19.6637C173.518 20.332 174.117 21.4744 174.272 23.0998H170.797C170.75 22.6514 170.621 22.2979 170.418 22.0392C170.034 21.5693 169.388 21.3322 168.469 21.3322C167.715 21.3322 167.176 21.4486 166.853 21.6857C166.529 21.9228 166.37 22.1987 166.37 22.5135C166.37 22.9101 166.542 23.199 166.883 23.38C167.223 23.5654 168.431 23.8888 170.504 24.3414C171.884 24.6648 172.923 25.1563 173.613 25.8159C174.294 26.4841 174.639 27.3162 174.639 28.3164C174.639 29.6314 174.147 30.7092 173.169 31.5413C172.190 32.3733 170.677 32.7915 168.629 32.7915C166.581 32.7915 164.999 32.3518 164.003 31.468C163.007 30.5842 162.511 29.4632 162.511 28.0966H166.034C166.107 28.7131 166.266 29.1528 166.508 29.4115C166.939 29.8728 167.736 30.1056 168.896 30.1056C169.577 30.1056 170.121 30.0021 170.522 29.7995C170.923 29.5969 171.125 29.2908 171.125 28.8855C171.125 28.4803 170.961 28.2 170.638 27.9974C170.315 27.7948 169.107 27.4456 167.017 26.9498C165.512 26.5747 164.451 26.1091 163.835 25.5486C163.218 24.9968 162.908 24.1992 162.908 23.1602C162.908 21.9314 163.391 20.8795 164.352 19.9957C165.314 19.1119 166.672 18.6721 168.418 18.6721C170.164 18.6721 171.431 18.9998 172.479 19.6594V19.6637Z" fill="#1F62AE"/>
  <path d="M189.832 28.4415C189.741 29.2304 189.332 30.0323 188.599 30.8428C187.461 32.1362 185.865 32.7829 183.818 32.7829C182.127 32.7829 180.636 32.2397 179.342 31.1489C178.049 30.0582 177.402 28.2863 177.402 25.8331C177.402 23.5352 177.984 21.7676 179.153 20.5432C180.321 19.3145 181.834 18.7023 183.692 18.7023C184.796 18.7023 185.792 18.9092 186.68 19.3231C187.564 19.737 188.297 20.3923 188.875 21.2848C189.396 22.0737 189.733 22.9877 189.888 24.0267C189.978 24.6346 190.013 25.5141 189.996 26.6609H180.899C180.946 27.9931 181.364 28.9286 182.153 29.4632C182.632 29.7952 183.21 29.9633 183.887 29.9633C184.602 29.9633 185.184 29.7607 185.628 29.3555C185.874 29.1356 186.085 28.8295 186.275 28.4415H189.823H189.832ZM186.396 24.3673C186.34 23.449 186.059 22.7506 185.559 22.2763C185.059 21.8021 184.438 21.565 183.701 21.565C182.895 21.565 182.274 21.815 181.83 22.3195C181.386 22.8239 181.11 23.5051 180.994 24.3673H186.396Z" fill="#1F62AE"/>
  <defs>
    <radialGradient id="paint0_radial_40002130_3398" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(22.0975 16.3958) scale(25.9711)">
      <stop offset="0.48" stop-color="#7ED2F6"/>
      <stop offset="0.96" stop-color="#0090D0"/>
    </radialGradient>
  </defs>
</svg>
                        </div>
                        <p style="font-size: 16px; margin-top: 5px; color: #777;">TRN: 100200300400500</p>
                        <p>Blueverse Vehicle Washing LLC Metropolis Towers #403 Business Bay, Dubai, UAE</p>
                        <p>+971 544692205</p>
                    </div>

                    <div class="barcode">
                        <!-- Barcode will be inserted here -->
                        <img src="${barcodeDataUri}" alt="barcode" width="150" height="60"/>
                    </div>

                    <table class="details-table">
                        <tr>
                            <td class="label">Invoice #</td>
                            <td>BV-${newInvoice.transactionId}</td>
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
                                <td class="text-right">${newInvoice.serviceDetails.price.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Discounts</td>
                                <td class="text-right">- ${newInvoice.discounts.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Subtotal</td>
                                <td class="text-right"> ${newInvoice.subtotal.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Tax Rate (${(newInvoice.taxRate * 100).toFixed(0)}%)</td>
                                <td class="text-right"> ${newInvoice.taxAmount.toFixed(2)}</td>
                            </tr>
                            <tr class="total-row">
                                <td>Total</td>
                                <td class="text-right">        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="24" viewBox="0 0 157 137" fill="none">
          <path d="M20.4758 47.6501C20.2049 38.9961 20.836 30.1235 20.4832 21.4945C20.354 18.3092 19.949 15.0245 19.2682 11.9162C18.3241 7.60294 16.7339 3.32939 13.7747 0.00993848L69.5396 0C83.0857 0.824894 96.6989 3.77414 108.332 10.91C121.51 18.9924 130.835 32.5113 134.045 47.6426C141.305 48.1122 148.319 45.6797 153.579 52.0304C156.633 55.7201 157.145 60.498 156.934 65.1443C155.495 63.9094 154.111 62.5553 152.277 61.8919C151.823 61.7279 150.143 61.236 149.768 61.236H136.271V75.0082H146.603C147.691 75.0082 150.29 76.417 151.226 77.0878C156.054 80.5415 157.319 86.6685 156.936 92.3161L153.711 89.8662C152.588 89.2302 151.403 88.8152 150.121 88.619H134.251C131.061 102.742 123.391 115.316 111.463 123.625C99.2432 132.135 84.2634 135.402 69.542 136.247L13.7772 136.237C18.8906 130.833 19.954 123.019 20.4857 115.868L20.4782 88.5966H10.8901C5.70717 88.5966 0 81.3142 0 76.407V71.1024C1.615 72.6553 3.13062 73.9945 5.35933 74.5833C5.77923 74.6951 7.02402 75.0107 7.35199 75.0107H20.4758V61.5192C20.4758 61.4993 20.2174 61.2409 20.1975 61.2409H10.3311C5.46617 61.2409 0 53.6082 0 49.0514V43.9331C1.24976 44.7257 2.07217 45.8711 3.4089 46.5742C4.01266 46.8922 6.02024 47.655 6.60909 47.655H20.4782L20.4758 47.6501ZM110.951 47.6501C108.946 35.7115 104.2 23.5045 94.3659 15.9364C85.625 9.208 74.4044 7.05384 63.579 6.70102C56.053 6.45504 48.4799 6.89979 40.9515 6.70848V47.6525H110.948L110.951 47.6501ZM40.954 75.0082H112.163C112.183 75.0082 112.441 74.7498 112.441 74.7299V61.5167C112.441 61.4968 112.183 61.2384 112.163 61.2384H40.954V75.0107V75.0082ZM110.672 88.5941H40.954V129.538C52.9249 129.285 65.102 130.457 76.8493 127.737C95.7001 123.371 105.929 110.978 110.116 92.5074C110.315 91.6278 110.869 89.742 110.879 88.9792C110.879 88.8103 110.829 88.6339 110.672 88.5966V88.5941Z" fill="black" />
        </svg> ₫ ${newInvoice.total.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="footer">
                        <p>Thanks for letting Blueverse shine on your ride! We’re grateful for your business and can’t wait to welcome you back for another spotless wash. Drive safe and stay shiny!</p>
                        <p><a href="https://wheat-ferret-827560.hostingersite.com/terms-conditions/#privacy">Privacy Policy</a> | <a href="https://wheat-ferret-827560.hostingersite.com/terms-conditions/">Terms and Conditions</a></p>
                    </div>
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
