FROM node:22-alpine

WORKDIR /app
COPY server /app/server

ENV CLIPPER_CONFIG=/app/server/config.json
EXPOSE 3217

CMD ["node", "server/server.js"]
