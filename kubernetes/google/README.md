# Kubernetes

This directory contains example manifests for deploying the authentication service within a Google-managed [Kubernetes](https://kubernetes.io) cluster using the [Google Kubernetes Engine](https://cloud.google.com/kubernetes-engine). This document describes the overall setup and provides additional tips and information. Familiarity with the `kubectl` command is assumed.

## Google Cloud Documentation

Visit https://console.cloud.google.com/ and use the search box at the top of the page to quickly find documentation and other relevant information. This guide will only cover the bare minimum for setting up these services, and relies heavily on the existing documentation by Google.

## Initial Setup

### Create the Cluster

1. Visit https://console.cloud.google.com/ in a browser
1. Create a new project or use an existing one.
1. Navigate to **Kubernetes Engine** and create a new cluster. There are no special requirements, the default selections will work fine.

### Client Setup

1. Install the Google Cloud CLI https://cloud.google.com/cli to your desktop or laptop.
    * If using [Homebrew](https://brew.sh), you can run `brew install google-cloud-sdk`
1. Update the installed components: `gcloud components update`
1. Install the `kubectl` command-line tool:
    * Using gcloud: `gcloud components install kubectl`
    * Using Homebrew: `brew install kubernetes-cli`
1. Install the GKE plugin for `kubectl` and authenticate with your cluster:

```shell
gcloud components install gke-gcloud-auth-plugin
gcloud auth login
gcloud config set project <name-of-project>
gcloud container clusters get-credentials <your-cluster> --region=<your-region>
```

### Artifact Registry

In order to produce container images and push them to a private registry, you will need to create an *image registry* and use that address when pulling private container images into your cluster. Google Cloud offers this as the **Artifact Registry** service, which charges for disk and network usage. See these [instructions](https://cloud.google.com/artifact-registry/docs/docker/store-docker-container-images) for details on the setup and usage.

### Ingress NGINX

While Google Cloud offers several options for ingress into a cluster, these example manifests were developed using the NGINX ingress controller to easily leverage the features it offers. As such, installing the `ingress-nginx` controller will be necessary, unless you choose to modify the service configuration. See the [documentation](https://kubernetes.github.io/ingress-nginx/deploy/) or simply use `helm` like so:

```shell
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

The command below will show that the nginx ingress controller was able to register with the load balancer to get an external address.

```shell
$ kubectl -n ingress-nginx get svc
NAME                                 TYPE           CLUSTER-IP       EXTERNAL-IP    PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   34.118.226.71    34.67.11.220   80:30977/TCP,443:30496/TCP   2m55s
ingress-nginx-controller-admission   ClusterIP      34.118.231.171   <none>         443/TCP                      2m55s
```

### Domain name resolution

These instructions assume that domain name resolution will be configured to resolve names like `auth-svc.pcloud` to the external IP address of services hosted in the GKE cluster. Something like [dnsmasq](https://thekelleys.org.uk/dnsmasq/doc.html) or `systemd-resolved` might be useful here, as well as just editing your `/etc/hosts` file. For a production environment, Google, as well as other companies, offer services for this purpose.

### Generate TLS certificates for nginx ingress

This step is done just once, as the contents of `secrets/auth-svc-tls.yaml` already contain the results of these steps and can be applied as usual. The only reason to run this again is if the certificates expired or the Common Name needs to be changed.

```shell
openssl req -sha256 -nodes -days 3650 -newkey rsa:4096 -keyout cluster.key -out cluster.csr -subj "/CN=auth-svc.pcloud" -addext "subjectAltName = DNS:auth-svc.pcloud"
openssl x509 -sha256 -req -in cluster.csr -CA ca.crt -CAkey ca.key -out cluster.crt -set_serial 01 -days 3650

kubectl apply -f namespaces/helix.yaml
kubectl -n helix create secret tls auth-svc-tls --cert cluster.crt --key cluster.key
kubectl -n helix get secret auth-svc-tls -o yaml
```

The output from last command (`get secret`) can be pasted into the `secrets/auth-svc-tls.yaml` file when the time comes to update the certificates.

### Build the service image

Kubernetes will pull container images from [Docker Hub](https://hub.docker.com) by default, unless the image includes the address of a registry. These manifests assume that to be the case, using `us-central1-docker.pkg.dev/p4-has-test-58982/my-docker-repo` as the address of a private artifact registry. The steps below will produce the image for the auth service and push it to that artifact registry.

**Note:** You will need to create your own registry and modify the commands below to match.

```shell
docker build -f containers/hub/Dockerfile -t helix-auth-svc .
docker image rm us-central1-docker.pkg.dev/p4-has-test-58982/my-docker-repo/helix-auth-svc
docker image tag helix-auth-svc us-central1-docker.pkg.dev/p4-has-test-58982/my-docker-repo/helix-auth-svc
docker push us-central1-docker.pkg.dev/p4-has-test-58982/my-docker-repo/helix-auth-svc
```

## Deploy

The manifests defined here include a _configmap_ that configures the auth service for OIDC and SAML authentication, using a specific account with a hosted identity provider. You will need to modify that configuration before deploying, otherwise testing will be difficult.

**Note:** You will need to edit the `deployments/helix-p4d.yaml` file to use the correct registry address for the `helix-p4d-basic` image before proceeding.

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

At this point, assuming your DNS and load balancer are set up correctly, visiting `https://auth-svc.pcloud` should display the auth service landing page.

## Reference

### Determine if nginx is terminating TLS connections

```shell
$ kubectl -n helix describe ingress auth-svc
Name:             auth-svc
Labels:           <none>
Namespace:        helix
Address:          34.67.11.220
Ingress Class:    <none>
Default backend:  <default>
TLS:
  auth-svc-tls terminates auth-svc.pcloud
Rules:
  Host             Path  Backends
  ----             ----  --------
  auth-svc.pcloud
                   /   auth-svc:80 (10.44.0.140:3000,10.44.0.28:3000)
Annotations:       kubernetes.io/ingress.class: nginx
                   nginx.ingress.kubernetes.io/auth-tls-pass-certificate-to-upstream: true
                   nginx.ingress.kubernetes.io/auth-tls-secret: helix/auth-ca-crt
                   nginx.ingress.kubernetes.io/auth-tls-verify-client: optional
Events:            <none>
```

### Confirm delivery of client certificate to auth service

This test will confirm that the client certificate is being passed through the nginx ingress controller to the authentication server in the backend. The second command should seemingly hang for several minutes, which indicates success. Any failure would return immediately with an error.

```shell
$ curl -k https://auth-svc.pcloud/requests/new/foobar
{"request":"01HB9KTQMWWGEYYT5WXK5TANSK",..."forceAuthn":false,"userId":"foobar","instanceId":"none"}

$ curl -k --cert loginhook/client.crt --key loginhook/client.key https://auth-svc.pcloud/requests/status/XYZ
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
