import { Router } from "express";
import {
  getCustomerExperiencePlansByUser,
  createCustomerExperiencePlan,
  updateCustomerExperiencePlan,
  deleteCustomerExperiencePlan,
} from "../controllers/customer-experience.controller";

const router = Router();

router.get("/user/:userId", getCustomerExperiencePlansByUser);
router.post("/", createCustomerExperiencePlan);
router.put("/:id", updateCustomerExperiencePlan);
router.delete("/:id", deleteCustomerExperiencePlan);

export default router;




