// Frontend CI/CD pipeline — Micro-Exchange (Next.js).
//
// On every push:
//   1. npm ci   (deterministic install).
//   2. lint + tsc --noEmit + next build (parallel where independent).
//
// On `main` only:
//   3. SSH into the deploy host, run infra/jenkins/exchange-fe-deploy.sh
//      (streamed via SSH stdin so the script is version-controlled in
//      this repo, not on the Jenkins server).
//
// Required Jenkins credentials:
//   - server-ssh-key  : SSH Username with private key for the deploy
//                       user on $DEPLOY_HOST. Reuses the same credential
//                       ID the backend pipeline uses.
//
// Wire-up:
//   1. New Item → Pipeline → SCM = this repo → Script Path = Jenkinsfile.
//   2. Agent needs node 20 + npm. Build does NOT need docker.

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 20, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    GIT_SHA     = "${env.GIT_COMMIT?.take(7) ?: 'dev'}"
    DEPLOY_HOST = '100.112.117.30'
    DEPLOY_USER = 'oceanroot'
    BRANCH_NAME = "${env.BRANCH_NAME ?: 'main'}"
  }

  stages {
    stage('Install') {
      // npm ci is the deterministic install — fails the build if
      // package-lock.json drifted from package.json instead of silently
      // upgrading like `npm install` would.
      steps { sh 'npm ci --no-audit --no-fund' }
    }

    stage('Lint + type-check') {
      // Both run against the same node_modules from the Install stage.
      // Run in parallel — eslint and tsc are CPU-independent.
      parallel {
        stage('eslint') { steps { sh 'npm run lint' } }
        stage('tsc')    { steps { sh 'npx tsc --noEmit' } }
      }
    }

    stage('Build (Next.js)') {
      // `output: standalone` in next.config.ts produces .next/standalone/
      // which is what the systemd unit on the host actually runs.
      // Validating the build here means a broken build never reaches prod.
      steps { sh 'npm run build' }
    }

    stage('Deploy to server') {
      when {
        anyOf {
          branch 'main'
          expression { return env.GIT_BRANCH == 'origin/main' || env.GIT_BRANCH == 'main' }
        }
      }
      steps {
        withCredentials([sshUserPrivateKey(credentialsId: 'server-ssh-key',
                                           keyFileVariable: 'SSH_KEY',
                                           usernameVariable: 'SSH_USER')]) {
          sh '''
            set -eu
            ssh -i "$SSH_KEY" \\
                -o StrictHostKeyChecking=no \\
                -o UserKnownHostsFile=/dev/null \\
                -o ConnectTimeout=10 \\
                "$SSH_USER@$DEPLOY_HOST" \\
                "BRANCH=$BRANCH_NAME GIT_SHA=$GIT_SHA bash -s" \\
                < infra/jenkins/exchange-fe-deploy.sh
          '''
        }
      }
    }
  }

  post {
    success {
      echo "Pipeline OK. sha=${env.GIT_SHA} branch=${env.BRANCH_NAME}"
    }
    failure {
      echo "Pipeline FAILED at sha ${env.GIT_SHA}"
    }
  }
}
