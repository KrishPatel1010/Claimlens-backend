import { Router } from "express";
import {
  processVideoHandler,
  getVideoDetailsHandler,
} from "../controllers/video-controller.js";

export const videoRouter: Router = Router();

videoRouter.post("/process", processVideoHandler);
videoRouter.get("/:videoId", getVideoDetailsHandler);
