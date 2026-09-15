FROM node:22

# Set the working directory inside the container to /app
WORKDIR /app

# Copy the package.json and package-lock.json files into the working directory
COPY package*.json ./

# Install the Node.js dependencies defined in package.json
RUN npm ci

# Copy the rest of the application's code into the working directory
COPY . .

# Inform Docker that the container listens on port 8080 at runtime
EXPOSE 8080

# Define the command to run the application
CMD ["node", "app.js"]