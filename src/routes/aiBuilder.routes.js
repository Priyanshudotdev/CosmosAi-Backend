import { Router } from "express";
import {
    handleChatWithGemini,
    handleCheckAiTemplate,
} from "../controllers/handleAiActions.controllers.js";

const router = Router();

router.route("/template").post(handleCheckAiTemplate);
router.route("/chat").post(handleChatWithGemini);

export default router;
