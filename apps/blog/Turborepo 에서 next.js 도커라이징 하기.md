## 0. 프롤로그
 
> 이 글은 뮤즈라이브에서 웹 서비스 3개를 모노레포 구조에서 Turborepo의 공식 문서를 참조하여 Next.js의 standalone 모드와 Docker를 활용한 모노레포 환경 설정 및 최적화 방법을 설명합니다.

### 목표

- Next.js standalone 모드 설명
- Turborepo를 활용한 모노레포 구성 이해
- Docker를 통해 효율적인 최적화 및 배포 방법

---

## 1. Next.js standalone 란?

Next.js standalone 모드는 애플리케이션을 컴파일하여 런타임에 불필요한 파일을 제거하고, 최적화된 상태로 제공하는 기능입니다. 이 모드는 애플리케이션을 더 작고
독립적인 단위로 패키징하여, 서버 실행 환경(Docker 등)에서 경량화와 성능 향상을 도모할 수 있습니다.

### 주요 특징

1. **최소화된 파일 크기**: 번들링 과정에서 `node_modules` 및 불필요한 파일을 배제하고, 필수 파일들만 포함합니다.
2. **독립적인 실행 환경**: 애플리케이션 실행을 위해 Next.js 소스 코드와 관련된 종속 파일만 필요합니다.
3. **서버 배포 최적화**: Docker와 같은 컨테이너 기반 시스템과 결합하여 보다 효과적인 배포가 가능해집니다.
4. **빠른 로딩 및 적은 리소스 사용**: 실행 시 필요한 최소한의 파일과 리소스만 포함되기 때문에 초기화 속도와 성능이 향상됩니다.
5. **CDN과 조합**: 캐싱 기능 및 네트워크 요청 최적화를 통해 전 세계적으로 빠르고 안정적인 콘텐츠 제공이 가능합니다.

이 모드를 활용하면 Next.js 애플리케이션 배포 및 운영 관리를 더욱 효율적으로 할 수 있습니다.


## 2. 프로젝트 구조
```
    📂 apps
    ├── 📂 web1
    │   ├── 📄 package.json
    ├── 📂 web2
    │   ├── 📄 package.json
    📂 pakages
    ├── 📂 ui
    │   ├── 📄 package.json
    ├── 📄 package.json
    ├── 📄 package-lock.json
```

### 프로젝트 구조 설명

`apps` 폴더는 실제 애플리케이션이 위치하는 디렉토리입니다. 여기에는 여러 개의 애플리케이션이 포함될 수 있으며, 이 예제에서는 `web1, web2` 애플리케이션이 있습니다.

`packages` 폴더는 재사용 가능한 패키지들이 위치하는 디렉토리입니다. 이곳에는 `ui` 같은 공통으로 사용 가능한 모듈이나 라이브러리가 포함됩니다.

- **`apps/web`**: 애플리케이션이 위치한 폴더로, Next.js 또는 다른 프레임워크 기반의 프로젝트가 포함될 수 있습니다.
    - `package.json`: 해당 애플리케이션의 종속성을 정의하는 파일입니다.

- **`packages/ui`**: 공유 가능한 UI 컴포넌트 또는 유틸리티가 포함된 폴더입니다.
    - `package.json`: 공통 패키지의 종속성을 정의하는 파일입니다.

- **최상위 `package.json` 및 `package-lock.json`**: 프로젝트 전체를 관리하기 위한 종속성 정의 및 고정 파일들입니다.

이런 구조를 통해 각 애플리케이션과 공통 패키지를 독립적이면서도 효율적으로 관리할 수 있습니다.

## 3. Turborepo를 활용한 효율적인 도커라이징 방법 소개 [(feat:공식문서)](https://turbo.hector.im/repo/docs/handbook/deploying-with-docker)

### DockerFile 작성하기

```dockerfile
FROM node:20
 
WORKDIR /usr/src/app
 
# Copy root package.json and lockfile
COPY package.json ./
COPY package-lock.json ./
 
# Copy the docs package.json
COPY apps/web1/package.json ./apps/web1/package.json
 
RUN npm install
 
# Copy app source
COPY . .
 
EXPOSE 8080
 
CMD [ "node", "apps/docs/server.js" ]
```

### 의존성 문제 발생

- **패키지 설치 문제**: apps/web1에 필요하지 않은 apps/web2의 의존성이 바뀌는 경우 불필요한 설치가 생깁니다. 또한 lock파일 또한 자주 바뀌어 이 또한 불필요한 빌드가 생길 수 있습니다.
- **의존성 충돌**: 여러 패키지가 같은 의존성을 다르게 요구하는 경우, 루트에서 설치된 의존성과 앱별 의존성이 충돌할 가능성이 있습니다.

- **해결책**
- 
Dockerfile에 대한 입력을 엄격히 필요한 것으로만 정리하는 것입니다. Turborepo는 간단한 솔루션을 제공합니다
```bash
  pnpm turbo prune --scope=web1 --docker
```
>이 명령을 실행하면 모노레포의 정리된 버전이 생성되어, ./out 디렉토리에 docs 이후에 달라지는 작업 공간만 포함됩니다.
>핵심은 잠금 파일을 정리하여 필요한 파일만 node_modules에 다운로드되도록 하는 것입니다. 기본적으로 turbo prune은 모든 관련 파일을 ./out에 넣지만,
>Docker 캐시 최적화를 위해 이상적으로는 파일을 두 단계로 복사합니다.

```
    out
    // json: 의존성 설치를 위해 사용하는 폴더
    ├── json
    │   └── apps
    │       └── web1
    │           └── package.json
    │   └── packages
    │       └── ui
    │           └── package.json
    // full: 실제 빌드에 필요한 모든 파일을 포함
    ├── full
    │   └── apps
    │       └── wseb1
    │           └── package.json
    │   └── packages
    │       └── ui
    │           └── package.json
    └── package-lock.json
```

### 솔류션을 적용한 DockerFile

```dockerfile
FROM node:alpine AS builder
RUN apk add --no-cache libc6-compat
RUN apk update
# Set working directory
WORKDIR /app
RUN pnpm global add turbo
COPY . .
RUN turbo prune --scope=web1 --docker
 
# Add lockfile and package.json's of isolated subworkspace
FROM node:alpine AS installer
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app
 
# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm.lock ./pnpm.lock
RUN pnpm install
 
# Build the project
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
RUN pnpm turbo run build --filter=web1...
 
FROM node:alpine AS runner
WORKDIR /app
 
# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
 
COPY --from=installer /app/apps/web1/next.config.js .
COPY --from=installer /app/apps/web1/package.json .
 
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/apps/web1/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web1/.next/static ./apps/web1/.next/static
 
CMD node apps/web1/server.js
```

### static s3 upload

> 빌드 과정에서 나오는 css, js, html을 cdn으로 올려
static 파일을 Amazon S3에 업로드하면, 빠르고 안정적으로 해당 리소스를 제공할 수 있습니다. 이를 통해 서버 부하를 줄이고, 클라이언트가 가까운 CDN 엣지에서 파일을
다운로드하도록 최적화할 수 있습니다.

### S3 업로드 예시

```bash
RUN --mount=type=secret,id=aws-access-key-id \
    --mount=type=secret,id=aws-secret-access-key \
    --mount=type=secret,id=aws-default-region \
    export AWS_ACCESS_KEY_ID=$(cat /run/secrets/aws-access-key-id) && \
    export AWS_SECRET_ACCESS_KEY=$(cat /run/secrets/aws-secret-access-key) && \
    export AWS_DEFAULT_REGION=$(cat /run/secrets/aws-default-region) && \
    aws s3 cp /app/apps/web1/.next/static s3://your-s3-bucket-name/_next/static --recursive

RUN rm -rf /app/apps/web1/.next/static
```

- `./out/apps/web1/.next/static`: Next.js 빌드 시 생성된 정적 파일들이 위치하는 디렉토리입니다.
- `./out/apps/web1/public`: 퍼블릭 폴더에 포함된 정적 리소스 파일들입니다.
- `s3://your-cdn-bucket-name`: 대상 S3 버킷 이름으로 적절히 변경합니다.
  해당 파일들은 클라이언트에서 CDN URL을 통해 접근할 수 있으므로, Next.js 설정에서 `assetPrefix`를 활용해 빌드된 출력물을 S3를 통해 제공받도록 수정해야 ******your-cdn-bucket-name******합니다.

### Next.js `assetPrefix` 설정 추가

```javascript
// next.config.js
module.exports = {
  assetPrefix: 'https://your-cdn-bucket-name.s3.amazonaws.com',
};
```

### 최종 구성

위 설정을 적용하면 정적 파일은 S3에서 제공되고, 애플리케이션 서버는 클라이언트 요청에 대한 동적 처리를 수행합니다. 이로써 효율적인 리소스 관리 및 빠른 정적 파일 제공이
가능합니다.

## 4. 마무리

위 과정을 통해 Turborepo 기반의 모노레포 환경에서 각 애플리케이션의 의존성을 효율적으로 관리하고, Docker 이미지를 최적화하는 방법을 학습했습니다. 이를 통해 다음과
같은 이점들을 얻을 수 있습니다

1. **효율적인 의존성 관리**: `turbo prune`을 통해 필요한 의존성과 파일만 포함하여 빌드 효율성을 극대화하였습니다.
2. **최적화된 Docker 이미지**: 단계별 빌드와 최소한의 파일 복사를 통해 빌드 시간을 단축하고 이미지 크기를 줄였습니다.
3. **CDN을 활용한 정적 파일 최적화**: 정적 파일을 S3로 업로드하고, `assetPrefix`를 사용해 Next.js 설정을 최적화하여 빠르고 안정적인 파일 제공이
   가능해졌습니다.

다음은 ecs와 code deploy를 활용한 배포 방식에대해 설명드리겠습니다. 