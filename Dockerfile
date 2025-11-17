# Use an official Node.js 20 runtime as a parent image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies with --legacy-peer-deps to bypass dependency conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Copy the environment file
COPY .env .env

# Build the NestJS application
RUN npm run build

# Expose port 5000 (default port for NestJS)
EXPOSE 5000

# Start the NestJS application
#CMD ["npm", "run", "start:prod"]
CMD ["npm", "run", "dev"]