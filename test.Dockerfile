FROM node:22-alpine
WORKDIR /app

RUN apk --no-cache add python3-dev musl-dev make g++ git
RUN mkdir runtime && echo '{}' > runtime/config.json
COPY package.json .
COPY yarn.lock .
COPY patches patches
COPY gtfs-realtime-proto gtfs-realtime-proto
RUN yarn --frozen-lockfile --non-interactive
COPY . .
CMD ["sh", "-c", "yarn lint && yarn build && yarn test"]
