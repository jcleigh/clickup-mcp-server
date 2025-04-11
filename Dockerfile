FROM node:alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy the source files and tsconfig BEFORE npm install
COPY src ./src
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Compile TypeScript to JavaScript
RUN npm run build

FROM node:alpine AS runtime

# Set the working directory
WORKDIR /app

# Copy the build output and node_modules from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

# Copy the entrypoint script if necessary
COPY --from=builder /app/package.json ./

# Expose the desired port (if the server binds to a port)
EXPOSE 8080

# Define the command to run the application
CMD ["node", "build/index.js"]