# Use the official Node.js 18 image as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy the necessary files and directories
COPY .next/standalone ./
COPY .next/static ./.next/static
# Expose port 3000
EXPOSE 3000

# Set the environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["node", "server.js"]
