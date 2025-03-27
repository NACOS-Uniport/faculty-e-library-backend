# Use Node.js 18 as the base image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install Yarn
RUN npm install -g yarn

# Copy package.json and yarn.lock (if it exists)
COPY package*.json yarn*.lock* ./

# Install dependencies using Yarn
RUN yarn install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the TypeScript project
RUN yarn build

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chmod 777 uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port the app will run on
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD wget -q --spider http://localhost:3000/api-docs || exit 1

# Start the application
CMD ["node", "dist/app.js"]
