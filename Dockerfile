FROM kkarczmarczyk/node-yarn:latest

WORKDIR /opt/

ADD ./ /opt/

ENV NODE_ENV production
ENV AUTH0_DOMAIN setme
ENV AUTH0_CLIENT_ID setme
ENV AUTH0_CLIENT_SECRET setme
ENV SESSION_SECRET setme
ENV MYSQL_HOST setme
ENV MYSQL_DATABASE setme
ENV MYSQL_USER setme
ENV MYSQL_PASSWORD setme
ENV DAEMON_HOST setme
ENV SERVICE_HOST setme
ENV SERVICE_PASSWORD setme

RUN yarn install

EXPOSE 3000

ENTRYPOINT [ "node", "/opt/index.js" ]