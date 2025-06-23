-- Analytics 시스템 재구조화 마이그레이션

-- 1. 기존 테이블 백업 (안전장치)
CREATE TABLE post_analytics_backup AS SELECT * FROM post_analytics;

-- 2. 새로운 테이블들 생성

-- 포스트 메타데이터 테이블 (기존 테이블을 재구조화)
DROP TABLE IF EXISTS post_analytics;
CREATE TABLE post_analytics (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  total_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 개별 조회 기록 테이블
CREATE TABLE post_view_logs (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL,
  visitor_id TEXT, -- 익명 사용자 구분용 (브라우저 fingerprint)
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT,
  -- 분석용 컬럼들 (트리거로 자동 생성)
  view_date DATE,
  view_hour INTEGER,
  view_day_of_week INTEGER,
  view_month INTEGER,
  view_year INTEGER
);

-- 일별 집계 테이블 (성능 최적화용)
CREATE TABLE daily_post_stats (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL,
  stat_date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  avg_time_on_page INTEGER, -- 초 단위
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slug, stat_date)
);

-- 3. 인덱스 생성
-- post_analytics 인덱스
CREATE INDEX idx_post_analytics_slug ON post_analytics(slug);
CREATE INDEX idx_post_analytics_total_views ON post_analytics(total_views DESC);

-- post_view_logs 인덱스
CREATE INDEX idx_post_view_logs_slug ON post_view_logs(slug);
CREATE INDEX idx_post_view_logs_date ON post_view_logs(view_date);
CREATE INDEX idx_post_view_logs_slug_date ON post_view_logs(slug, view_date);
CREATE INDEX idx_post_view_logs_visitor ON post_view_logs(visitor_id);
CREATE INDEX idx_post_view_logs_viewed_at ON post_view_logs(viewed_at);

-- daily_post_stats 인덱스
CREATE INDEX idx_daily_stats_slug_date ON daily_post_stats(slug, stat_date);
CREATE INDEX idx_daily_stats_date ON daily_post_stats(stat_date);

-- 4. RLS 정책 설정
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_view_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_post_stats ENABLE ROW LEVEL SECURITY;

-- post_analytics 정책
CREATE POLICY "Allow anonymous read access to post analytics"
  ON post_analytics
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous update of post analytics"
  ON post_analytics
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous insert of post analytics"
  ON post_analytics
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- post_view_logs 정책
CREATE POLICY "Allow anonymous read access to view logs"
  ON post_view_logs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert of view logs"
  ON post_view_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- daily_post_stats 정책
CREATE POLICY "Allow anonymous read access to daily stats"
  ON daily_post_stats
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous upsert of daily stats"
  ON daily_post_stats
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 5. 기존 데이터 마이그레이션
INSERT INTO post_analytics (slug, total_views, created_at, updated_at)
SELECT 
  slug, 
  views as total_views,
  created_at,
  NOW() as updated_at
FROM post_analytics_backup;

-- 분석용 컬럼 자동 생성 트리거
CREATE OR REPLACE FUNCTION set_view_analytics_columns()
RETURNS TRIGGER AS $$
BEGIN
  NEW.view_date := NEW.viewed_at::DATE;
  NEW.view_hour := EXTRACT(HOUR FROM NEW.viewed_at);
  NEW.view_day_of_week := EXTRACT(DOW FROM NEW.viewed_at);
  NEW.view_month := EXTRACT(MONTH FROM NEW.viewed_at);
  NEW.view_year := EXTRACT(YEAR FROM NEW.viewed_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_view_analytics_columns
  BEFORE INSERT OR UPDATE ON post_view_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_view_analytics_columns();

-- 기존 조회 기록을 post_view_logs에 추가 (추정 데이터)
-- 실제로는 기존 총 조회수를 여러 날짜에 분산하여 생성
INSERT INTO post_view_logs (slug, viewed_at, visitor_id)
SELECT 
  slug,
  created_at + (generate_series(1, views) * INTERVAL '1 hour'),
  'migrated_' || generate_series(1, views)
FROM post_analytics_backup;

-- 6. 통계 함수들 생성

-- 조회수 증가 함수 (개선된 버전)
CREATE OR REPLACE FUNCTION increment_post_views(
  post_slug TEXT,
  visitor_session_id TEXT DEFAULT NULL,
  visitor_ip INET DEFAULT NULL,
  visitor_user_agent TEXT DEFAULT NULL,
  visitor_referrer TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  current_views INTEGER;
  visitor_hash TEXT;
BEGIN
  -- 방문자 ID 생성 (IP + User Agent 기반 해시)
  visitor_hash := COALESCE(visitor_session_id, 
    'anon_' || MD5(COALESCE(visitor_ip::TEXT, '') || COALESCE(visitor_user_agent, '')));
  
  -- 개별 조회 기록 추가
  INSERT INTO post_view_logs (
    slug, 
    visitor_id, 
    ip_address, 
    user_agent, 
    referrer,
    session_id
  ) VALUES (
    post_slug, 
    visitor_hash, 
    visitor_ip, 
    visitor_user_agent, 
    visitor_referrer,
    visitor_session_id
  );
  
  -- post_analytics 테이블 업데이트 (총 조회수)
  INSERT INTO post_analytics (slug, total_views, unique_visitors, updated_at)
  VALUES (post_slug, 1, 1, NOW())
  ON CONFLICT (slug) 
  DO UPDATE SET 
    total_views = post_analytics.total_views + 1,
    unique_visitors = (
      SELECT COUNT(DISTINCT visitor_id) 
      FROM post_view_logs 
      WHERE slug = post_slug
    ),
    updated_at = NOW()
  RETURNING total_views INTO current_views;
  
  RETURN current_views;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 일별 통계 집계 함수
CREATE OR REPLACE FUNCTION aggregate_daily_stats(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS void AS $$
BEGIN
  INSERT INTO daily_post_stats (slug, stat_date, views, unique_visitors)
  SELECT 
    slug,
    target_date,
    COUNT(*) as views,
    COUNT(DISTINCT visitor_id) as unique_visitors
  FROM post_view_logs 
  WHERE view_date = target_date
  GROUP BY slug
  ON CONFLICT (slug, stat_date) 
  DO UPDATE SET 
    views = EXCLUDED.views,
    unique_visitors = EXCLUDED.unique_visitors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 통계 조회 함수들

-- 일별 조회수 트렌드
CREATE OR REPLACE FUNCTION get_daily_view_trend(
  days_back INTEGER DEFAULT 30,
  target_slug TEXT DEFAULT NULL
)
RETURNS TABLE(
  stat_date DATE,
  total_views BIGINT,
  unique_visitors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.stat_date,
    COALESCE(SUM(d.views), 0) as total_views,
    COALESCE(SUM(d.unique_visitors), 0) as unique_visitors
  FROM daily_post_stats d
  WHERE d.stat_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
    AND (target_slug IS NULL OR d.slug = target_slug)
  GROUP BY d.stat_date
  ORDER BY d.stat_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 월별 조회수 트렌드
CREATE OR REPLACE FUNCTION get_monthly_view_trend(
  months_back INTEGER DEFAULT 12,
  target_slug TEXT DEFAULT NULL
)
RETURNS TABLE(
  month_date DATE,
  total_views BIGINT,
  unique_visitors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', d.stat_date)::DATE as month_date,
    COALESCE(SUM(d.views), 0) as total_views,
    COALESCE(SUM(d.unique_visitors), 0) as unique_visitors
  FROM daily_post_stats d
  WHERE d.stat_date >= DATE_TRUNC('month', CURRENT_DATE - (months_back || ' months')::INTERVAL)
    AND (target_slug IS NULL OR d.slug = target_slug)
  GROUP BY DATE_TRUNC('month', d.stat_date)
  ORDER BY month_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 인기 포스트 순위
CREATE OR REPLACE FUNCTION get_popular_posts(
  days_back INTEGER DEFAULT 30,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  slug TEXT,
  total_views BIGINT,
  unique_visitors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.slug,
    COALESCE(SUM(d.views), 0) as total_views,
    COALESCE(SUM(d.unique_visitors), 0) as unique_visitors
  FROM daily_post_stats d
  WHERE d.stat_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
  GROUP BY d.slug
  ORDER BY total_views DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 요일별 트래픽 패턴
CREATE OR REPLACE FUNCTION get_weekly_traffic_pattern(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  day_of_week INTEGER,
  day_name TEXT,
  total_views BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pvl.view_day_of_week,
    CASE pvl.view_day_of_week 
      WHEN 0 THEN '일요일'
      WHEN 1 THEN '월요일'
      WHEN 2 THEN '화요일'
      WHEN 3 THEN '수요일'
      WHEN 4 THEN '목요일'
      WHEN 5 THEN '금요일'
      WHEN 6 THEN '토요일'
    END as day_name,
    COUNT(*)::BIGINT as total_views
  FROM post_view_logs pvl
  WHERE pvl.viewed_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
  GROUP BY pvl.view_day_of_week
  ORDER BY pvl.view_day_of_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 시간대별 트래픽 패턴
CREATE OR REPLACE FUNCTION get_hourly_traffic_pattern(
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
  hour INTEGER,
  total_views BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pvl.view_hour,
    COUNT(*)::BIGINT as total_views
  FROM post_view_logs pvl
  WHERE pvl.viewed_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
  GROUP BY pvl.view_hour
  ORDER BY pvl.view_hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 초기 일별 통계 집계 실행
SELECT aggregate_daily_stats(generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', '1 day'::INTERVAL)::DATE);

-- 8. 백업 테이블 정리 (선택사항 - 주석 해제시 실행)
-- DROP TABLE post_analytics_backup;

COMMENT ON TABLE post_analytics IS '포스트 메타데이터 및 총 조회수';
COMMENT ON TABLE post_view_logs IS '개별 조회 기록 - 실시간 분석용';
COMMENT ON TABLE daily_post_stats IS '일별 집계 데이터 - 성능 최적화용';