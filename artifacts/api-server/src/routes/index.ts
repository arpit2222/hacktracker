import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import monitorRouter from "./monitor.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/monitor", monitorRouter);

export default router;
