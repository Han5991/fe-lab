# 🔄 Supabase 마이그레이션 가이드

## 현재 상황

- **로컬**: 새로운 Analytics 시스템 (post_analytics, post_view_logs, daily_post_stats)
- **프로덕션**: 기존 Analytics 시스템 (post_analytics with views, last_viewed)

## 🚀 프로덕션 마이그레이션 방법

### 방법 1: 수동 SQL 실행 (권장)

1. **Supabase 대시보드 접속**

   - https://supabase.com/dashboard/project/anbofhnldllmivlovyqb
   - SQL Editor 메뉴로 이동

2. **production_migration.sql 파일 실행**

   ```
   supabase/production_migration.sql 파일 내용을 복사해서 실행
   ```

3. **실행 결과 확인**
   ```
   🎉 Analytics system migration completed successfully!
   Tables created: post_analytics, post_view_logs, daily_post_stats
   Functions created: increment_post_views, aggregate_daily_stats, get_*_trend
   ```

### 방법 2: CLI를 통한 마이그레이션

```bash
# 1. 프로젝트 연결 확인
pnpm supabase projects list

# 2. 현재 상태와 차이점 확인
pnpm supabase db diff

# 3. 마이그레이션 적용 (DB 비밀번호 필요)
pnpm supabase db push

# 4. 적용 확인
pnpm supabase db diff
```

## 🔍 현재 설정된 동기화 흐름

### 로컬 개발 → 프로덕션 동기화

```bash
# 1. 로컬에서 마이그레이션 파일 생성
supabase/migrations/20250623_new_feature.sql

# 2. 로컬에서 테스트
pnpm supabase db reset

# 3. 프로덕션에 적용
pnpm supabase db push
```

### 프로덕션 → 로컬 동기화

```bash
# 1. 프로덕션 스키마를 로컬로 가져오기
pnpm supabase db pull

# 2. 차이점 확인
pnpm supabase db diff

# 3. 로컬 적용
pnpm supabase db reset
```

## 📋 마이그레이션 체크리스트

### ✅ 마이그레이션 전

- [ ] 프로덕션 데이터 백업 확인
- [ ] 로컬에서 마이그레이션 테스트 완료
- [ ] 새로운 함수들이 정상 작동하는지 확인

### ✅ 마이그레이션 후

- [ ] 테이블 구조 확인: `post_analytics`, `post_view_logs`, `daily_post_stats`
- [ ] 함수 확인: `increment_post_views`, `get_daily_view_trend` 등
- [ ] RLS 정책 적용 확인
- [ ] 기존 데이터 마이그레이션 확인

### ✅ 애플리케이션 테스트

- [ ] 조회수 증가 기능 작동 확인
- [ ] 12시간 쿨다운 기능 작동 확인
- [ ] React Query 캐싱 작동 확인
- [ ] 폴백 시스템 작동 확인

## 🛠️ 트러블슈팅

### 문제: "relation already exists" 에러

```sql
-- 해결: 기존 테이블 백업 후 재생성
DROP TABLE post_analytics CASCADE;
-- 그 후 마이그레이션 재실행
```

### 문제: 마이그레이션 충돌

```bash
# 해결: 특정 마이그레이션부터 다시 실행
pnpm supabase db reset
pnpm supabase db push
```

### 문제: 함수가 없어서 404 에러

- 현재 코드는 자동 폴백 시스템이 있어서 문제없음
- 새 함수 적용 후 자동으로 새 시스템 사용

## 📈 향후 마이그레이션 관리

### 1. 개발 워크플로우

```
로컬 개발 → 마이그레이션 파일 생성 → 로컬 테스트 → 프로덕션 적용
```

### 2. 자동화 (GitHub Actions)

```yaml
# .github/workflows/deploy-migrations.yml
- name: Deploy migrations
  run: |
    supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
    supabase db push
```

### 3. 백업 전략

- 매 마이그레이션 전 자동 백업
- 중요한 변경사항은 수동 백업

## 🔗 유용한 명령어

```bash
# 현재 연결된 프로젝트 확인
pnpm supabase projects list

# 로컬과 프로덕션 차이점 확인
pnpm supabase db diff

# 프로덕션 스키마 가져오기
pnpm supabase db pull

# 로컬 스키마를 프로덕션에 적용
pnpm supabase db push

# 로컬 DB 초기화
pnpm supabase db reset

# 마이그레이션 상태 확인
pnpm supabase status
```
