// Builds the Express app (kept separate from server.js so tests can use it)
const path = require('path');
const express = require('express');
const logger = require('./config/logger');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json({ limit: '100kb' }));

// Log every request with its status and time taken
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () =>
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`),
  );
  next();
});

// Never serve the frontend's build tooling (Tailwind packages, package files)
app.use(['/node_modules', '/package.json', '/package-lock.json'], notFound);

// Serve the HTML/CSS/JS pages from the /frontend folder
app.use(express.static(path.join(__dirname, '../../frontend'), { dotfiles: 'ignore' }));

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler); // must be last

module.exports = app;
