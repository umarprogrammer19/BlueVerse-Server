import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        serviceDetails: new mongoose.Schema({
            id: { type: String },
            serviceName: {
                type: String,
                required: true
            },
            type: { type: String },
            price: {
                type: Number,
                required: true
            }
        }),
        state: {
            type: String,
            default: "Al Quoz"
        },
        discounts: {
            type: Number,
            default: 0
        }, 
        subtotal: {
            type: Number,
            required: true
        },
        taxRate: {
            type: Number,
            default: 0.05
        },
        taxAmount: {
            type: Number,
            required: true
        },
        total: {
            type: Number,
            required: true
        },
    }, { timestamps: true });

    
// Tax & total Calculating From Backend
invoiceSchema.pre("validate", function () {
    const price = this.serviceDetails?.price || 0;
    const discount = this.discounts || 0;

    const subtotal = price - discount;
    const taxAmount = subtotal * this.taxRate;
    const total = subtotal + taxAmount;

    this.subtotal = subtotal;
    this.taxAmount = taxAmount;
    this.total = total;

});

export default mongoose.model("Invoice", invoiceSchema);
