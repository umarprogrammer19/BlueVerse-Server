import { User } from "../models/user.models.js";

export const createCustomer = async (req, res) => {
    try {
        const { customerId, firstName, lastName, email, phoneNumber, licencePlateNumber, address, state } = req.body;

        const user = await User.findOne({ $or: [{ customerId }, { email }] });

        if (user) return res.status(400).json({
            success: false,
            message: "User already exists"
        });

        await User.create({
            customerId,
            firstName,
            lastName,
            email,
            phoneNumber,
            licencePlateNumber,
            address,
            state,
        });
        res.status(201).json({
            success: true,
            message: "Customer created successfully"
        });
    } catch (error) {
        console.error("Error creating customer:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
}

export const getCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const user = await User.findOne({ customerId });
        if (!user) return res.status(404).json({
            success: false,
            message: "Customer not found"
        });
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("Error getting customer:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
}

export const deleteCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const user = await User.findOne({ customerId });
        if (!user) return res.status(404).json({
            success: false,
            message: "Customer not found"
        });
        await user.deleteOne();
        res.status(200).json({
            success: true,
            message: "Customer deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting customer:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
}

export const updateCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { firstName, lastName, email, phoneNumber, licencePlateNumber, address, state } = req.body;
        if (!firstName && !lastName && !email && !phoneNumber && !licencePlateNumber && !address && !state)
            return res.status(400).json({
                success: false,
                message: "No fields to update"
            });
        const user = await User.findOne({ customerId });
        if (!user) return res.status(404).json({
            success: false,
            message: "Customer not found"
        });
        await user.updateOne({
            firstName,
            lastName,
            email,
            phoneNumber,
            licencePlateNumber,
            address,
            state,
        });
        res.status(200).json({
            success: true,
            message: "Customer updated successfully"
        });
    } catch (error) {
        console.error("Error updating customer:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
}

export const getAllCustomers = async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json({
            success: true,
            users
        });
    } catch (error) {
        console.error("Error getting all customers:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
}
