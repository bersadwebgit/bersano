#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

# Run Prisma migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Applying database migrations..."
  prisma migrate deploy
else
  echo "DATABASE_URL is not set. Skipping migrations."
fi

# Execute the main container command (starting nextjs server)
echo "Starting Next.js server..."
exec node server.js
