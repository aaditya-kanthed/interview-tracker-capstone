// Starts the web server (like the main() method of a Spring Boot app)
const app = require('./app');
const { port } = require('./config/env');
const logger = require('./config/logger');
const emailService = require('./services/emailService');

app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
  emailService.verifyConnection(); // logs whether email (SMTP) is working
});
