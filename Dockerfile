FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./

# Valores por defecto para KyraCloud; las variables de entorno del panel los sobrescriben.
# Cuando tengas la URL del frontend, pon ALLOWED_ORIGINS=https://<tu-frontend>.kyracloud.com
ENV PORT=3000
ENV ALLOWED_ORIGINS=*

EXPOSE 3000

CMD ["npm", "start"]
