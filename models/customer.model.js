// models/Customer.js
import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
    customerId: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    licencePlateNumber: {
        type: String,
        required: true
    },
    address: {
        type: String,
    },
    state: {
        type: String,
        default: "Al Quoz"
    },
}, { timestamps: true });

export default mongoose.model("Customer", customerSchema);
