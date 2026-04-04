import { Router, type IRouter } from "express";
import healthRouter from "./health";
import teamsRouter from "./teams";
import statsRouter from "./stats";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(teamsRouter);
router.use(statsRouter);

export default router;
