import { Router } from "express";
import { protect } from "../middleware/auth";
import {
  getConversations,
  getMessages,
  sendMessage,
} from "../controllers/message.controller";

const router = Router();

// All messaging routes are protected
router.use(protect);

router.get("/conversations", getConversations);
router.get("/conversations/:conversationId", getMessages);
router.post("/conversations/:conversationId", sendMessage);

export default router;
