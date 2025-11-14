import { Router } from "express";
import {
  getSalesPagesByUser,
  createSalesPage,
} from "../controllers/sales-pages.controller";

const router = Router();

router.get("/user/:userId", getSalesPagesByUser);
router.post("/", createSalesPage);

export default router;


