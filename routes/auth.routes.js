import express from "express";
import { login, logOut, signup } from "../controllers/auth.conrollers.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", signup);
router.post("/logout", logOut);

export default router;