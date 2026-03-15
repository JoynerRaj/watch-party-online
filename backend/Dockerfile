# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set working directory in the container
WORKDIR /app

# Copy the requirements file to the container
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source code
COPY . .

# Expose the port Uvicorn will run on
EXPOSE 8000

# Command to run the application
# We use the $PORT environment variable format for compatibility with Render/Railway
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
