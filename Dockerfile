# Use the official Nginx image based on Alpine Linux version 1.25.0
# Alpine is chosen for its small footprint, making the final image lighter
FROM nginx:1.25.0-alpine

# Set the working directory to Nginx's default HTML serving directory
WORKDIR /usr/share/nginx/html

# Remove all existing files in the working directory
# This ensures a clean slate for our application files
RUN rm -rf ./*

# Copy the contents of the local 'build' directory to the working directory in the container
# This assumes your application has been built and the output is in a 'build' folder
COPY  ./build .

# Set the entrypoint to run Nginx in the foreground
# The 'daemon off' directive prevents Nginx from running as a background process
# This is important in Docker containers to keep the container running
ENTRYPOINT ["nginx", "-g", "daemon off;"]