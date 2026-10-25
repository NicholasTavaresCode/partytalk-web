#!/usr/bin/env bash
# Deploy partytalk-web to Cloud Run — HML (partytalk-hml).
#
#   ./deploy-hml.sh
#
# Two commands, not one, and deliberately not `gcloud run deploy --source .` as the API
# repo uses: that flag cannot pass Docker build args, and this app cannot be built
# without them — NEXT_PUBLIC_* is inlined into the client bundle during `next build`.
# Deployed the other way the service comes up healthy and every browser call still goes
# to the fallback `http://localhost:3000`. So: `builds submit` with substitutions, then
# `run deploy --image`.
#
# APIs are enabled below on every run. One-time prerequisites, none created here:
#   - $SERVICE_ACCOUNT — the API's account, shared on purpose so HML has one identity to
#     manage. Used for BOTH this build and this runtime; what they need of it is
#     roles/logging.logWriter, roles/storage.objectUser and roles/artifactregistry.writer,
#     which the API deploy requires anyway. Trade-off: this internet-facing container
#     also carries the API's Firestore and Vertex AI roles, which it never uses. Give it
#     its own account with just those three roles before production.
#   - The `cloud-run-source-deploy` image repository — created by the API's first
#     `run deploy --source`, so the first time, deploy the API before this.
#   - $PUBLIC_URL among the OAuth client's Authorized JavaScript origins, or "Sign in
#     with Google" fails before the API is ever called.

set -euo pipefail

PROJECT_ID=partytalk-hml
PROJECT_NUMBER=484961620847
REGION=us-central1
SERVICE_NAME=partytalk-web
# Shared with partytalk-api (see the top).
SERVICE_ACCOUNT=partytalk-api-hml@${PROJECT_ID}.iam.gserviceaccount.com

# Created by the API's first `run deploy --source`; both images live there.
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${SERVICE_NAME}"
# A unique tag per build, so each Cloud Run revision points at exactly the image built
# for it rather than whatever `latest` is by the time the deploy resolves it.
TAG="$(date -u +%Y%m%d-%H%M%S)"

# No custom DNS. Cloud Run URLs are deterministic (https://SERVICE-PROJECTNUMBER.REGION.run.app),
# which is what lets this build be pinned to the API's URL before the API exists, and the
# API allow this origin by CORS before this exists.
PUBLIC_URL="https://${SERVICE_NAME}-${PROJECT_NUMBER}.${REGION}.run.app"
API_URL="https://partytalk-api-${PROJECT_NUMBER}.${REGION}.run.app"

# The browser talks to the API directly — REST with the Google ID token as Bearer, and
# the Socket.IO `/rooms` namespace on the same origin. No proxy, no cookies.
NEXT_PUBLIC_API_BASE_URL="${API_URL}/api/v1"
NEXT_PUBLIC_API_SOCKET_URL="${API_URL}"
# Must equal the API's GOOGLE_OAUTH_CLIENT_ID (its deploy-hml.sh): the API verifies every
# ID token against it as the audience.
NEXT_PUBLIC_GOOGLE_CLIENT_ID=484961620847-joi2l06qeuem1ocna1fnt4n907j8gp7g.apps.googleusercontent.com
# NEXT_PUBLIC_DISABLE_AUTH / NEXT_PUBLIC_DEV_BEARER_TOKEN are deliberately absent: they are
# local-dev escape hatches and must never be baked into a deployed bundle.

SUBSTITUTIONS="_IMAGE=${IMAGE}"
SUBSTITUTIONS+=",_TAG=${TAG}"
SUBSTITUTIONS+=",_NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}"
SUBSTITUTIONS+=",_NEXT_PUBLIC_API_SOCKET_URL=${NEXT_PUBLIC_API_SOCKET_URL}"
SUBSTITUTIONS+=",_NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}"

# Enable what this deploy uses, so gcloud never stops at an "API not enabled — enable and
# retry?" prompt halfway through. A few seconds when they are already on. (Firestore,
# Vertex AI, Secret Manager belong to the API — its deploy script enables those.)
REQUIRED_APIS=(
  run.googleapis.com              # Cloud Run — this service
  cloudbuild.googleapis.com       # `builds submit` runs cloudbuild.yaml
  artifactregistry.googleapis.com # stores the built image
  logging.googleapis.com          # build and runtime logs
)
echo "Enabling required APIs…"
gcloud services enable "${REQUIRED_APIS[@]}" --project "$PROJECT_ID"

echo "Building $SERVICE_NAME ($TAG) for $PROJECT_ID/$REGION — a few minutes."

gcloud builds submit \
  --config cloudbuild.yaml \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --service-account "projects/$PROJECT_ID/serviceAccounts/$SERVICE_ACCOUNT" \
  --substitutions="$SUBSTITUTIONS" \
  .

echo "Deploying $SERVICE_NAME."

# No runtime env: every value this app reads is NEXT_PUBLIC_* and already baked in above,
# and the server never calls the API itself (all data fetching is client-side).
#
# --allow-unauthenticated: the marketing page is public, and the app's own sign-in gate
# plus the API's allow-list decide who gets further. Cloud Run IAM can't express that.
#
# No --max-instances 1 here — that constraint belongs to the API, where the realtime state
# lives. This service is stateless and scales normally.
gcloud run deploy "$SERVICE_NAME" \
  --image "${IMAGE}:${TAG}" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --service-account "$SERVICE_ACCOUNT" \
  --allow-unauthenticated \
  --port 8080 \
  --min-instances 0 \
  --max-instances 2 \
  --concurrency 80 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60

echo
echo "Live:  $PUBLIC_URL"
echo "API:   $API_URL  (this build is pinned to it)"
echo "Logs:  gcloud run services logs tail $SERVICE_NAME --region $REGION --project $PROJECT_ID"
