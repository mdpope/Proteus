FROM node:22-alpine
WORKDIR /app
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund ws@8.22.0
COPY --chown=node:node server.js ./server.mjs
USER node
EXPOSE 4318
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:4318/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
