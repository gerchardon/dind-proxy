# dind-proxy

[![Dependency Status](https://david-dm.org/gerchardon/dind-proxy.svg)](https://david-dm.org/gerchardon/dind-proxy)

## Use Case

### Envy & dind

Access to export port of a docker engine runing in docker (dind)

    docker run -d --name envy --privileged -v /tmp/data:/data -v /var/run/docker.sock:/var/run/docker.sock \
        -p 8000:80 -p 2222:22 -e HOST_DATA=/tmp/data progrium/envy
    sudo npm install -g dind-proxy
    sudo dind-proxy

Go to http://envy.127.0.0.1.xip.io/u/<gituser>

Edit file /env/Dockerfile :
    FROM gerchardon/docker-client

run
    rebuild

Launch a docker

    docker run -p 80:80 -d tutum/apache-php

Go to http://<gituser>.<gituser>.127.0.0.1.xip.io

### Export same port

    docker run --name site1 -d tutum/apache-php
    docker run --name site2 -d tutum/apache-php

Go to :

* http://site1.127.0.0.1.xip.io/
* http://site2.127.0.0.1.xip.io/
