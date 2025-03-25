import express from 'express';
import AdminJS from 'adminjs';
import { buildAuthenticatedRouter } from '@adminjs/express';
import routes from './routes/index.js';
import provider from './admin/auth-provider.js';
import options from './admin/options.js';
import initializeDb from './db/index.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { setupSwagger } from './swagger.js';

dotenv.config();

const port = process.env.PORT || 3000;

const start = async () => {
  const app = express();

  await initializeDb();

  const admin = new AdminJS(options);

  if (process.env.NODE_ENV === 'production') {
    await admin.initialize();
  } else {
    admin.watch();
  }

  const router = buildAuthenticatedRouter(
    admin,
    {
      cookiePassword: process.env.COOKIE_SECRET,
      cookieName: 'adminjs',
      provider,
    },
    null,
    {
      secret: process.env.COOKIE_SECRET,
      saveUninitialized: true,
      resave: true,
    }
  );
  app.use(cors());

  // Setup Swagger documentation
  setupSwagger(app);

  app.use(admin.options.rootPath, router);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use('/api/v1/', routes);

  app.listen(port, () => {
    console.log(`AdminJS available at http://localhost:${port}${admin.options.rootPath}`);
    console.log(`API documentation available at http://localhost:${port}/api-docs`);
  });
};

start();
