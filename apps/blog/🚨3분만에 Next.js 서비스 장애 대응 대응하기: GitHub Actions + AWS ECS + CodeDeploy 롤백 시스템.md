## 0. 프롤로그

> 이번글에서는 지난번까지 구축한 ECS 환경에서, 오류 발생 시 애플리케이션을 안정적으로 롤백하는 방법에 대해 다뤄보겠습니다.
> 특히 GitHub Actions, AWS CodeDeploy를 활용하여 자동화된 배포 및 롤백 프로세스를 구현하는 방법을 중심으로 설명드릴 예정입니다.

### 문제 설명

>평화로운 정기 배포의 날, 늘 그랬듯 배포 버튼을 누르고 커피 한 잔의 여유를 즐기며 배포 완료를 기다렸습니다.
>커피를 다 마시고 나서야 배포 완료 메시지를 확인하며 "오늘도 무사히 넘어갔구나"라는 안도의 한숨을 내쉬었습니다.
>
>그러나 약 2시간 후, 한 고객으로부터 "특정 기능 사용 시 페이지가 다운된다"는 신고가 접수되었습니다.
>해당 기능은 당일 새롭게 배포된 것으로, 상황의 심각성을 더했습니다.
>
>문제의 원인을 조사한 결과, 백엔드와 사전에 협의한 API 배포 일정이 내부 커뮤니케이션 오류로 인해 진행되지 않은 상태임을 확인할 수 있었습니다.
>백엔드에서는 아직 개발이 진행 중이었으나, 프론트엔드에서는 이미 배포된 상황이었기에 긴급하게 롤백을 결정하게 되었습니다.
>
>배포했던 브랜치를 재확인하고 빌드부터 배포까지 진행하는 데 총 30분이 소요되었습니다.
>
>비록 당장의 위기는 해소되었으나, 이러한 상황이 재발될 경우를 대비하여 보다 신속하고 효율적으로 대응할 수 있는 시스템의 필요성을 절실히 느끼게 되었습니다.
>이에 따라, 롤백 시스템의 개선을 결심하게 되었습니다.

## 1. 현재 문제 설정

1. **필요한 배포 버전 선정 및 결정**
   1. 필요한 버전을 노션에 작성된 배포트레커를 통해 찾는다.
   2. 해당 merge pr를 찾는다.
   3. 코드를 읽고 필요한 내용인지 검토 한다.

   **※ 특히 2번과 3번 단계에서는 소요 시간이 많고, 실수가 발생할 가능성도 있음을 유념해야 합니다.**
   
2. **빌드 및 배포**
   1. **빌드 (약 6분 소요):**
      이미 ECR에 등록된 이미지가 존재함에도 불구하고, 상황에 따라 재활용하지 않고 새롭게 빌드를 진행 합니다.
   2. **배포 (약 3분 소요):**
      빌드 완료 후 배포 절차를 진행합니다.

## 2. 개선 목표

> esc 에 code deploy 가 연동 되어 있으면 task definition을 새로 만들어 올리면 해당 테스크를 새로 수행 합니다.
> 이를 이용하여 롤백을 구현 합니다.

1. **효율적인 버전 선정 및 롤백 절차**
    - 버전 관리를 체계화하여 필요한 배포 버전을 쉽고 빠르게 확인할 수 있도록 개선합니다.
    - 코드 검토, 빌드, 배포 전 과정에서 불필요한 시간 낭비를 줄이기 위해 자동화된 검증 절차를 추가합니다.

2. **배포 시간 단축**
    - ECR 이미지를 재활용할 수 있는 환경을 마련하여, 빌드 시간을 가능한 한 단축합니다.
    - 불필요한 프로세스를 제거하여 배포에 걸리는 시간을 줄입니다.

3. **문제 발생 시 빠른 대처**
    - 롤백이 신속히 실행될 수 있도록 기존 스크립트 및 설정을 간소화합니다.
    - 문제 발생 시 알림 및 관련 정보를 빠르게 제공하는 시스템을 연계 도입합니다.

## 3 개선 방법

1. 효율적인 버전 선정 및 롤백 절차

    1. **버전 관리 시스템 개선**
        - 배포 하기 전에 노션에 배포 트레커에 내용과 버전을 적어 내용을 바로 확인 하도록 하기
        - 배포 시 package.json에 있는 versoin을 사용해 ecr애 해당 버전과 latest를 둘다 push 한다.
        - ```yaml
            - name: 'VERSION 추출 및 검증'
              id: set-version
              run: |
              # package.json에서 version 추출
              VERSION=$(jq -r '.version' apps/web1/package.json)
              VERSION="v${VERSION}"
        
              # 버전 값이 올바른지 검증
              if [[ ! $VERSION =~ ^v[0-9a-zA-Z._-]+$ ]]; then
              echo "유효하지 않은 버전 형식입니다: $VERSION"
              exit 1
              fi
        
              echo "VERSION=$VERSION" >> $GITHUB_ENV
              echo "확정된 버전: $VERSION"

            - name: '도커 이미지 빌드 & ECR 푸쉬 '
              id: build-image
              run: |
              DOCKER_BUILDKIT=1 docker build  \
              docker build 
              docker tag ${{ secrets.AWS_ECR_REPOSITORY_NEXT }}:latest ${{ secrets.AWS_ECR_REPOSITORY_NEXT }}:${{ env.VERSION }}
              docker push ${{ secrets.AWS_ECR_REPOSITORY_NEXT }}:${{ env.VERSION }}
              docker push ${{ secrets.AWS_ECR_REPOSITORY_NEXT }}:latest
          ```

    2. **버전 조회 자동화**
        - git acton 의 workflow을 통해서 사용하고자 하는 vesion을 입력 받습니다.
        - ```yaml
           workflow_dispatch:
             inputs:
               version:
                 description: '버전 번호를 입력하세요 ex) v1.0.0'
                 required: true
                 default: 'latest'
          ```
        - 특정 버전의 image가 ecr에 있는 지 확인 합니다.
        - ```yaml
           - name: 'ECR image tag 확인'
             run: |
             aws ecr describe-images \
             --repository-name web1 \
             --image-ids imageTag=${{ env.VERSION }} \
             >/dev/null 2>&1 && echo "Image found" || { echo "Image not found"; exit 1; }
          ```

    3. **롤백 절차 최적화**
        - task-definition 내 이미지 태그를 지정된 버전으로 업데이트 합니다.
        - ```yaml
           - name: 'task-definition 업데이트'
             run: |
             sed -i -e 's|\(web1\)"|\1:${{ env.VERSION }}"|g' \
             -e 's|\(web1\)"|\1:${{ env.VERSION }}"|g' \
             ./deploy/ops/web1/task-definition.json
          ```
        - ecs deploy를 사용하여 배포를 수행 합니다.
        - ```yaml
           - name: '[ROLLBACK] ECS 롤백 배포'
             run: |
             aws ecs deploy \
             --task-definition ./deploy/ops/web1/task-definition.json \
             ~~ 나머지 arg
          ```
          
## 4. 수행 결과

문서화된 글을 확인하여 배포 하므로 코드를 보고 내용을 확인 안 해도 되며
이미 ecr에 등록된 이미지를 재사용함으로 빌드 시간을 줄일 수 있습니다.

그래서 배포 시간(3분)만 있으면 안정적인 롤백을 수행 할 수 있습니다. 심지어 특정 개발자에게 의존하지 않고 누구든 롤백을 수행 할 수 있게 되었습니다.

이제 다시 마음 놓고 테스크를 수행하러 갈 수 있게 되었습니다.(정말?)

## 5. 아쉬운 부분

저희 서비스 코드는 모노레포로 구성되어 있어 tag를 활용한 버전관리 자동화가 어려운 상황입니다. 이로 인해 버전 관리를 여전히 수동으로 수행해야 한다는 점이 아쉽습니다.

혹시 이 글을 읽는 독자분들 중에 해당 문제를 겪으시거나 해결책을 아시는 분은 댓글 부탁드립니다.

## 6. 느낀점

이번 개선 작업을 통해 배포 프로세스의 효율성과 안정성이 크게 향상되었습니다. 특히, ECR 이미지의 재활용과 자동화된 버전 관리를 통해 빌드 및 롤백 시간을 단축할 수 있었던
점이 만족스럽습니다.
그리고, 누구나 쉽게 롤백을 수행할 수 있도록 시스템을 간소화한 것이 이번 작업의 큰 성과 중 하나였습니다.
다만, 모노레포 구조로 인해 태그 기반 버전 관리 자동화가 어려운 점은 여전히 숙제로 남아 있습니다.
이를 해결하기 위한 추가적인 연구와 노력이 필요하며, 앞으로도 계속해서 개선 작업을 진행해야 한다고 느꼈습니다.