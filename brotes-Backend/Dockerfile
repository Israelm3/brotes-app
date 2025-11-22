FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY public ./public
COPY routes ./routes
COPY index.js ./
COPY firebaseAdmin.js ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "index.js"]
