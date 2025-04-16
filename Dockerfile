# Use the official Bun image as base
FROM oven/bun:1.2

# Create and set working directory
WORKDIR /app

# Copy package.json and bun.lockb (if it exists)
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy the rest of the application
COPY . .

# Build the application
RUN bun run build

# Expose the port
EXPOSE 3000

# Set environment variables
ENV STORAGE_DIR=/data

# Create a volume for the storage
VOLUME [ "/data" ]

# Start the application
CMD ["bun", "run", "index.ts"]
