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