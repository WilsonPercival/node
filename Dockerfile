FROM node:12.0.0
WORKDIR /usr/src/app
COPY package*.json ./
ENV port 8089
RUN npm install node-static
RUN npm install ws
ENTRYPOINT ["npm", "start"]