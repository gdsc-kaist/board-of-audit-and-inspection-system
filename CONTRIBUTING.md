# KAIST 감사원 시스템 기여 가이드라인

## 체크리스트

Pull Request (PR)을 생성하기 전에 아래 항목을 확인해주세요.

-   유닛 테스트 돌려보기
    -   테스트가 만들어져있지 않다면 테스트 만들기
-   `swagger`에 변경사항을 반영했는지 확인하기
-   `prettier`를 실행했는지 확인하기

## Test Driven Development (TDD)

-   새로운 기능을 기여할때는 a) 올바르게 코드를 제안했는지, b) 유지보수 비용을 줄이기위해 미래에 코드가 망가지는 것을 방지하는 것에 도움이 되도록 유닛 테스트를 포함시키세요.
-   버그가 있다는 것은 보통 테스크 커버리지가 불충분하다는것을 의미하기 때문에, 버그 수정은 일반적으로 유닛 테스트를 필요로 합니다.
-   API 호환성을 염두하세요. KAIST 감사원 시스템은 배포중인 프로젝트이므로 이전 버전과 호환되지 않는 API 변경을 만들어서는 안됩니다.

## 유닛 테스트

아래의 명령어를 실행해서 로컬 개발환경에서 유닛 테스트를 실행하세요.

```bash
docker compose -f compose-dev.yaml up --build
npm test
```

## Prettier

아래의 명령어를 실행해서 코드의 포맷을 맞춰주세요.

```bash
npx prettier -w .
```
