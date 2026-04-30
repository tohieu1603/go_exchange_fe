// Frontend CI/CD pipeline. Lints + type-checks + builds Next.js, then on
// `main` builds and pushes a Docker image to Docker Hub.
//
// Required Jenkins credentials:
//   - dockerhub-credentials: Username/password (or PAT) for Docker Hub.
//
// Pipeline params:
//   - DOCKERHUB_USER (default tohieu16)
//   - IMAGE_NAME (default micro-exchange-frontend)
//
// Wire-up:
//   1. New Pipeline job → SCM = this repo → Script Path = Jenkinsfile
//   2. Use the same dockerhub-credentials ID as the backend repo.
//   3. Agent needs node 20 + docker (or use a docker agent).

pipeline {
  agent any

  parameters {
    string(name: 'DOCKERHUB_USER', defaultValue: 'tohieu16',
           description: 'Docker Hub user/org for image tag')
    string(name: 'IMAGE_NAME', defaultValue: 'micro-exchange-frontend',
           description: 'Docker image name (without user prefix)')
  }

  options {
    timestamps()
    timeout(time: 20, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    GIT_SHA = "${env.GIT_COMMIT?.take(7) ?: 'dev'}"
  }

  stages {
    stage('Install') {
      steps { sh 'npm ci --no-audit --no-fund' }
    }

    stage('Lint + type-check') {
      // Parallel — both fast, independent. Failure in either fails the build.
      parallel {
        stage('eslint') { steps { sh 'npm run lint' } }
        stage('tsc')    { steps { sh 'npx tsc --noEmit' } }
      }
    }

    stage('Build (Next.js)') {
      steps { sh 'npm run build' }
    }

    stage('Build + push Docker image') {
      when {
        anyOf {
          branch 'main'
          expression { return env.GIT_BRANCH == 'origin/main' || env.GIT_BRANCH == 'main' }
        }
      }
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials',
                                          usernameVariable: 'DH_USER',
                                          passwordVariable: 'DH_PASS')]) {
          sh '''
            set -eu
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin

            IMAGE="${DOCKERHUB_USER}/${IMAGE_NAME}"
            docker build -t ${IMAGE}:${GIT_SHA} -t ${IMAGE}:latest .
            docker push ${IMAGE}:${GIT_SHA}
            docker push ${IMAGE}:latest

            docker logout
          '''
        }
      }
    }
  }

  post {
    always {
      sh 'docker image prune -f --filter "until=24h" || true'
    }
  }
}
