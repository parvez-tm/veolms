// VeoLMS backend CI/CD — single-server deploy.
//
// Model: Jenkins itself runs INSIDE a Docker container and drives the HOST's
// Docker daemon (Docker-out-of-Docker — the host's /var/run/docker.sock is
// mounted into Jenkins). The pipeline builds the backend image and (re)runs it as
// a sibling container on the host. No registry, no remote SSH.
//
// Key consequence: the docker DAEMON is the host's, so anything the daemon
// resolves (`-v` bind mounts, `-p`, `--add-host`, `--restart`) refers to the
// HOST filesystem/network — but the docker CLI's own file reads (`--env-file`,
// build context) come from INSIDE the Jenkins container. The runtime env file
// lives on the host (outside Jenkins), so we bind-mount it into the app container
// instead of using `--env-file` (which the CLI would look for inside Jenkins and
// not find).
//
// Prerequisites (one-time):
//   - Jenkins container started with the host socket + a docker CLI available, e.g.:
//       docker run -d --name jenkins \
//         -v /var/run/docker.sock:/var/run/docker.sock \
//         -v jenkins_home:/var/jenkins_home \
//         <jenkins-image-with-docker-cli>
//     (the jenkins user must be allowed to use the socket — match the host docker GID).
//   - /opt/veolms/.env exists ON THE HOST (KEY=VALUE lines: JWT_SECRET,
//     POSTGRES_*/DATABASE_URL + DATABASE_SSL, REDIS_URL, R2_*, RAZORPAY_*, ...).
//     The app loads it via dotenv at startup; it is never baked into the image.
//
// Redis/Postgres: the app container reaches host services via host.docker.internal
// (mapped below) — e.g. REDIS_URL=redis://host.docker.internal:6379 if Redis runs
// on the host. Postgres is Neon (managed), so DATABASE_SSL=true.

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
          # This shell runs inside the Jenkins container and can't see the host FS,
          # so verify the host env file via a throwaway container (daemon-resolved
          # mount of its directory). A missing dir would mount empty, so test the file.
          ENV_DIR=$(dirname "$ENV_FILE")
          ENV_NAME=$(basename "$ENV_FILE")
          docker run --rm -v "$ENV_DIR":/host:ro alpine test -f "/host/$ENV_NAME" \
            || { echo "ERROR: $ENV_FILE not found on the host"; exit 1; }

          # Replace the running container with the freshly built image. The host
          # env file is bind-mounted to /app/.env (the app loads it via dotenv);
          # PORT is pinned so the listen port matches the published port.
          docker rm -f "$CONTAINER" 2>/dev/null || true

          docker run -d \
            --name "$CONTAINER" \
            -v "$ENV_FILE":/app/.env:ro \
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
