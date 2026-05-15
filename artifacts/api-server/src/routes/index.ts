import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import postsRouter from "./posts";
import complaintsRouter from "./complaints";
import eventsRouter from "./events";
import placementsRouter from "./placements";
import feedbackRouter from "./feedback";
import notificationsRouter from "./notifications";
import lostFoundRouter from "./lost-found";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/posts", postsRouter);
router.use("/complaints", complaintsRouter);
router.use("/events", eventsRouter);
router.use("/placements", placementsRouter);
router.use("/feedback", feedbackRouter);
router.use("/notifications", notificationsRouter);
router.use("/lost-found", lostFoundRouter);
router.use("/stats", statsRouter);

export default router;
