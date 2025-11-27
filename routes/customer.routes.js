import express from "express";
import {
    createCustomer,
    getCustomer,
    deleteCustomer,
    updateCustomer,
    getAllCustomers
} from "../controllers/customer.controllers.js";

const router = express.Router();

router.post("/create", createCustomer);
router.get("/get/:customerId", getCustomer);
router.delete("/delete/:customerId", deleteCustomer);
router.put("/update/:customerId", updateCustomer);
router.get("/all", getAllCustomers);

export default router;
