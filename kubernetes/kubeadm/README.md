# Kubernetes

This directory contains example manifests for deploying the authentication service within a local [Kubernetes](https://kubernetes.io) cluster. This document describes the overall setup and provides additional tips and information. Familiarity with the `kubectl` command is assumed.

## Initial Setup

### Create the Cluster

The instructions here assume you are comfortable with provisioning system software and constructing a local cluster from scratch. The procedure for doing this is not documented here as that is well outside of the scope of this guide. As a point of reference, these manifests were developed and tested on a single-node cluster created using `kubeadm`, with [containerd](https://containerd.io) as the container runtime, [Flannel](https://github.com/flannel-io/flannel) as the network layer, [Longhorn](https://longhorn.io/) for storage, and [MetalLB](https://metallb.universe.tf) serving as the load balancer.  Domain name resolution was set up using [dnsmasq](https://thekelleys.org.uk/dnsmasq/doc.html) to resolve the `*.cluster` names to the MetalLB load balancer.

### Load Balancer

On a local network, the best option at this time is to use MetalLB which runs within Kubernetes and serves the same basic purpose by advertising Layer 2 name resolution to the network. See also https://kubernetes.github.io/ingress-nginx/deploy/baremetal/ for more information when using this with the nginx ingress controller, which these manifests are utilizing.

Note that when configuring MetalLB, it helps to use a set of IP addresses that are within the subnet of your LAN. That is, if your local router subnet is `192.168.1.0/24` then MetalLB should be configured to use addresses within `192.168.1.x` that will not conflict with existing hosts, as well as whatever range the router uses for dynamic address assignment (DHCP).

### Generate TLS certificates for nginx ingress

This step is done just once, as the contents of `secrets/auth-svc-tls.yaml` already contain the results of these steps and can be applied as usual. The only reason to run this again is if the certificates expired or the Common Name needs to be changed.

```shell
openssl req -sha256 -nodes -days 3650 -newkey rsa:4096 -keyout cluster.key -out cluster.csr -subj "/CN=auth-svc.cluster" -addext "subjectAltName = DNS:auth-svc.cluster"
openssl x509 -sha256 -req -in cluster.csr -CA ca.crt -CAkey ca.key -out cluster.crt -set_serial 01 -days 3650

kubectl apply -f namespaces/helix.yaml
kubectl -n helix create secret tls auth-svc-tls --cert cluster.crt --key cluster.key
kubectl -n helix get secret auth-svc-tls -o yaml
```

The output from last command (`get secret`) can be pasted into the `secrets/auth-svc-tls.yaml` file when the time comes to update the certificates.

### Build the service image

Kubernetes will pull container images from [Docker Hub](https://hub.docker.com) by default, unless the image includes the address of a registry. These manifests assume that to be the case, using `192.168.1.1:5000` as the address of a local image registry. The steps below will produce the image for the auth service and push it to that local registry.

```shell
docker build -f containers/hub/Dockerfile -t helix-auth-svc .
docker image rm 192.168.1.1:5000/helix-auth-svc
docker image tag helix-auth-svc 192.168.1.1:5000/helix-auth-svc
docker push 192.168.1.1:5000/helix-auth-svc
```

## Deploy

The manifests defined here include a _configmap_ that configures the auth service for OIDC and SAML authentication, using a specific account with a hosted identity provider. You will need to modify that configuration before deploying, otherwise testing will be difficult.

**Note:** You will need to edit the `deployments/auth-svc.yaml` file to use the correct registry address for the `helix-auth-svc` image before proceeding.

For now, deploy everything one step at a time.

```shell
kubectl apply -f namespaces/helix.yaml
kubectl apply -f secrets/auth-ca-crt.yaml
kubectl apply -f secrets/auth-svc-tls.yaml
kubectl apply -f secrets/oidc-client-creds.yaml
kubectl apply -f configmaps/auth-svc.yaml
kubectl apply -f services/redis.yaml
kubectl apply -f services/auth-svc.yaml
kubectl apply -f deployments/redis.yaml
kubectl apply -f deployments/auth-svc.yaml
kubectl apply -f ingresses/auth-svc.yaml
```

At this point, assuming your DNS and load balancer are set up correctly, visiting `https://auth-svc.cluster` should display the auth service landing page.

## Reference

### Determine if nginx has an external address

This command will assist in confirming that the nginx ingress controller was able to register with the load balancer to get an external address.

```shell
$ kubectl -n ingress-nginx get svc
NAME                      TYPE           CLUSTER-IP       EXTERNAL-IP    PORT(S)                      AGE
ingress-nginx-controller  LoadBalancer   10.105.127.122   192.168.1.20   80:30791/TCP,443:30237/TCP   2d18h
```

### Determine if nginx is terminating TLS connections

```shell
$ kubectl -n helix describe ingress auth-svc
Name:             auth-svc
Labels:           <none>
Namespace:        helix
Address:          192.168.1.21
Ingress Class:    nginx
Default backend:  <default>
TLS:
  auth-svc-tls terminates auth-svc.cluster
Rules:
  Host              Path  Backends
  ----              ----  --------
  auth-svc.cluster
                    /   auth-svc:80 (10.244.0.156:3000,10.244.0.161:3000)
Annotations:        nginx.ingress.kubernetes.io/auth-tls-pass-certificate-to-upstream: true
                    nginx.ingress.kubernetes.io/auth-tls-secret: helix/auth-ca-crt
                    nginx.ingress.kubernetes.io/auth-tls-verify-client: optional
Events:
  Type    Reason  Age    From                      Message
  ----    ------  ----   ----                      -------
  Normal  Sync    37m    nginx-ingress-controller  Scheduled for sync
  Normal  Sync    5m17s  nginx-ingress-controller  Scheduled for sync
```

### Confirm delivery of client certificate to auth service

This test will confirm that the client certificate is being passed through the nginx ingress controller to the authentication server in the backend. The second command should seemingly hang for several minutes, which indicates success. Any failure would return immediately with an error.

```shell
$ curl -k https://auth-svc.cluster/requests/new/foobar
{"request":"01HB9KTQMWWGEYYT5WXK5TANSK",..."forceAuthn":false,"userId":"foobar","instanceId":"none"}

$ curl -k --cert loginhook/client.crt --key loginhook/client.key https://auth-svc.cluster/requests/status/XYZ
```

Replace the `XYZ` in the second command with the value for `request` from the output of the first command.

### Modify configmap and restart the deployment

Make your changes to the `configmaps/auth-svc.yaml` file and then run the following commands to apply those changes and restart the service.

```shell
kubectl replace -f configmaps/auth-svc.yaml
kubectl -n helix rollout restart deployment/auth-svc
kubectl -n helix rollout status -w deployment/auth-svc
```

To confirm that the service restarted and appears to be functioning correctly, examine the log output from the pod(s).

```shell
$ kubectl -n helix get pods
NAME                        READY   STATUS        RESTARTS   AGE
auth-svc-5b484c7655-7wf4x   1/1     Running       0          9s
auth-svc-6dc76b6d64-6ztns   1/1     Terminating   0          166m

$ kubectl -n helix logs auth-svc-5b484c7655-7wf4x
debug: container: using .env admin authentication {"timestamp":"2023-09-26T19:01:28.140Z"}
debug: container: registering in-memory-login repositories {"timestamp":"2023-09-26T19:01:28.144Z"}
debug: container: registering in-memory-helix repositories {"timestamp":"2023-09-26T19:01:28.144Z"}
debug: creating http server {"timestamp":"2023-09-26T19:01:28.166Z"}
info: www: use `kill -USR2 1` to reload .env changes {"timestamp":"2023-09-26T19:01:28.170Z"}
debug: www: .env file not loaded: ENOENT: no such file or directory, open '.env' {"timestamp":"2023-09-26T19:01:28.171Z"}
debug: www: listening on port 3000 {"timestamp":"2023-09-26T19:01:28.172Z"}
```

### Helpful Resources

* https://prefetch.net/blog/2019/10/16/the-beginners-guide-to-creating-kubernetes-manifests/
* https://kubernetes.io/docs/reference/kubectl/cheatsheet/
* https://learnk8s.io/troubleshooting-deployments
