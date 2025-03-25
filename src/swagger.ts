import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Faculty of Science Material Upload Platform API',
      version: '1.0.0',
      description: 'API for managing educational materials',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Material: {
          type: 'object',
          required: ['level', 'courseCode', 'courseTitle', 'url', 'description'],
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated MongoDB ID',
            },
            level: {
              type: 'string',
              description: 'Study level',
            },
            courseCode: {
              type: 'string',
              description: 'Course code',
            },
            courseTitle: {
              type: 'string',
              description: 'Course title',
            },
            url: {
              type: 'string',
              description: 'URL to the material file',
            },
            description: {
              type: 'string',
              description: 'Material description',
            },
            approved: {
              type: 'boolean',
              description: 'Approval status',
              default: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated MongoDB ID',
            },
            email: {
              type: 'string',
              description: 'User email address',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};
