ARG target
FROM $target

COPY qemu-* /usr/bin/

LABEL maintainer="Jesse Stuart <hi@jessestuart.com>"
LABEL name="renovate"

ARG version
LABEL version="$version"

WORKDIR /usr/src/app/

RUN \
  apk add --quiet --no-cache git openssh-client

COPY package.json yarn.lock ./
RUN yarn --production -s --no-progress && yarn cache clean
COPY lib lib

ENTRYPOINT ["node", "/usr/src/app/lib/renovate.js"]
