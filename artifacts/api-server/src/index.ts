import app from "./app";
import { logger } from "./lib/logger";
import { initTeams } from "./lib/teamStore";

const port = Number(process.env["PORT"] || "5000");

initTeams().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}).catch((err) => {
  logger.error({ err }, "Failed to initialize teams from DB");
  process.exit(1);
});
