// VeoLMS backend CI/CD — single-server deploy.
//
// Model: Jenkins runs ON the same instance that hosts the app, and that node has
// Docker. The pipeline builds the backend image and (re)runs it as a container on
// this box. No registry, no remote SSH — build and run are local.
//
// Prerequisites on the server (one-time):
//   - Docker installed and running.
//   - The Jenkins user can talk to Docker (e.g. `usermod -aG docker jenkins`,
//     then restart the Jenkins service).
//   - The runtime env file exists at /opt/veolms/.env (KEY=VALUE lines, the same
//     vars the app expects: JWT_SECRET, POSTGRES_*/DATABASE_URL + DATABASE_SSL,
//     REDIS_URL, R2_*, RAZORPAY_*, SEED_ON_START, ...). It is NOT baked into the
//     image — it's read at `docker run` time, so secrets stay off the image.
//
// Redis/Postgres note: the container reaches the host via `host.docker.internal`
// (mapped below). If Redis runs on the host, set REDIS_URL=redis://host.docker.internal:6379
// in /opt/veolms/.env. Postgres is Neon (managed), so DATABASE_SSL=true.

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 20, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  environment {
    IMAGE      = 'veolms-backend'
    CONTAINER  = 'veolms-backend'
    PORT       = '5005'             // host + container port on the server
    BUILD_CTX  = 'backend'          // Dockerfile lives in ./backend
    ENV_FILE   = '/opt/veolms/.env' // runtime config on the server
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build image') {
      steps {
        // The Dockerfile already runs `tsc` in its build stage, so a type error
        // here fails the build (that's our compile gate). Tag with the build
        // number for traceability/rollback, plus a moving :latest.
        sh '''
          set -e
          docker build -t "$IMAGE:$BUILD_NUMBER" -t "$IMAGE:latest" "$BUILD_CTX"
        '''
      }
    }

    stage('Deploy') {
      steps {
        sh '''
          set -e
          test -f "$ENV_FILE" || { echo "ERROR: env file not found at $ENV_FILE"; exit 1; }

          # Replace the running container with the freshly built image.
          docker rm -f "$CONTAINER" 2>/dev/null || true

          docker run -d \
            --name "$CONTAINER" \
            --env-file "$ENV_FILE" \
            -e PORT="$PORT" \
            -p "$PORT:$PORT" \
            --add-host=host.docker.internal:host-gateway \
            --restart unless-stopped \
            "$IMAGE:$BUILD_NUMBER"
        '''
      }
    }

    stage('Verify') {
      steps {
        // Wait for the app to report ready. The backend connects to Postgres
        // (and seeds on an empty DB) before it logs "listening on port", so a
        // few retries cover startup. Fail loudly if the container exits early.
        sh '''
          set -e
          ready=0
          for i in $(seq 1 20); do
            state=$(docker inspect -f "{{.State.Running}}" "$CONTAINER" 2>/dev/null || echo missing)
            if [ "$state" != "true" ]; then
              echo "Container is not running (state=$state). Recent logs:"
              docker logs --tail 120 "$CONTAINER" 2>/dev/null || true
              exit 1
            fi
            if docker logs "$CONTAINER" 2>&1 | grep -q "listening on port"; then
              ready=1
              break
            fi
            sleep 3
          done
          if [ "$ready" != "1" ]; then
            echo "App did not become ready in time. Recent logs:"
            docker logs --tail 120 "$CONTAINER"
            exit 1
          fi
          echo "Deployed and healthy:"
          docker ps --filter "name=$CONTAINER"
        '''
      }
    }
  }

  post {
    success {
      // Drop dangling images so repeated builds don't fill the disk.
      sh 'docker image prune -f >/dev/null 2>&1 || true'
      echo "Deployed $IMAGE:$BUILD_NUMBER on port $PORT."
    }
    failure {
      sh 'docker logs --tail 80 "$CONTAINER" 2>/dev/null || true'
    }
  }
}
