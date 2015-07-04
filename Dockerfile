FROM alpine

RUN apk --update add nodejs
COPY package.json /src/
WORKDIR /src/
RUN npm install
COPY . /src/

ENTRYPOINT ["node", "server.js"]
EXPOSE 80