# 📊 AI 어쏘 - 분석 & 로깅 시스템 계획서

## 개요

이 문서는 AI 어쏘 서비스의 **사용자 행동 분석**, **API 성능 모니터링**, **LLM 비용 추적**을 위한 로깅 시스템 설계를 정리합니다.

### 목표
1. **API 호출량/응답시간** 측정 → 성능 병목 파악
2. **LLM 비용** 추적 → 비용 최적화 근거
3. **사용자 행동** 분석 → 기능 우선순위 결정
4. **에러** 추적 → 서비스 안정성 향상

### 기술 스택
| 목적 | 도구 | 비용 |
|-----|-----|-----|
| API 모니터링 | Grafana Cloud | 무료 (10K 메트릭) |
| 사용자 행동 | PostHog Cloud | 무료 (1M 이벤트/월) |
| 에러 추적 | Sentry | 무료 (5K 에러/월) |
| LLM 비용 | 커스텀 DB 로깅 | 없음 |

### 배포 환경
- **Backend**: AWS Lightsail
- **Frontend**: Vercel

---

## 데이터베이스 테이블 설계

### 테이블 관계도

```
api_logs (전체 API 요청)
    │
    ├── llm_usage_logs (LLM 사용 비용)
    │
    └── chat_logs (홈 에이전트 대화)
            │
            └── tool_usage_logs (도구 사용 기록)
```

---

### 테이블 1: `api_logs` (전체 API 로깅)

**목적**: 모든 API 요청의 호출량, 응답시간, 상태코드를 기록합니다.

| 컬럼 | 타입 | 설명 |
|-----|-----|-----|
| id | Integer, PK | 기본키 |
| user_id | Integer, FK, nullable | 인증된 사용자 (비로그인 시 null) |
| method | String(10) | HTTP 메서드 (GET, POST, PUT, DELETE) |
| endpoint | String(255) | API 엔드포인트 (/api/v1/cases, /api/v1/agent/chat) |
| referer | String(500), nullable | 요청 출처 페이지 URL (어느 페이지에서 호출했는지) |
| path_params | JSON | 경로 파라미터 (예: {case_id: 1}) |
| query_params | JSON | 쿼리 파라미터 (예: {limit: 10}) |
| status_code | Integer | HTTP 상태코드 (200, 400, 500) |
| latency_ms | Integer | 응답 시간 (밀리초) |
| request_size | Integer | 요청 바이트 크기 |
| response_size | Integer | 응답 바이트 크기 |
| error_message | Text, nullable | 에러 발생 시 메시지 |
| created_at | DateTime | 요청 시각 |

**수집 위치**: FastAPI 미들웨어

**referer 수집 방법**:
```python
referer = request.headers.get("referer", None)
# 예: "https://app.example.com/cases/1" → 사건 상세 페이지에서 호출
# 예: "https://app.example.com/chat" → 채팅 페이지에서 호출
```

---

### 테이블 2: `llm_usage_logs` (LLM 비용 추적)

**목적**: LLM API 호출마다 토큰 사용량과 비용을 기록합니다.

| 컬럼 | 타입 | 설명 |
|-----|-----|-----|
| id | Integer, PK | 기본키 |
| api_log_id | Integer, FK | 연결된 API 요청 |
| user_id | Integer, FK | 사용자 ID |
| endpoint | String(255) | 어떤 API에서 호출했는지 |
| model | String(50) | 사용 모델 (gpt-4o-mini, gpt-4o) |
| purpose | String(50) | 호출 목적 (router, agent, generator, general, analyze, compare, timeline, relationship) |
| input_tokens | Integer | 입력 토큰 수 |
| output_tokens | Integer | 출력 토큰 수 |
| cost_usd | Float | 계산된 비용 (USD) |
| created_at | DateTime | 호출 시각 |

**비용 계산 기준** (2024년 기준):
| 모델 | Input | Output |
|-----|-------|--------|
| gpt-4o | $2.50 / 1M tokens | $10.00 / 1M tokens |
| gpt-4o-mini | $0.15 / 1M tokens | $0.60 / 1M tokens |

**수집 위치**: LLM 호출 직후 (각 서비스에서)

---

### 테이블 3: `chat_logs` (홈 에이전트 대화 로그)

**목적**: 홈 에이전트의 대화 내용과 처리 과정을 기록합니다.

| 컬럼 | 타입 | 설명 |
|-----|-----|-----|
| id | Integer, PK | 기본키 |
| api_log_id | Integer, FK | 연결된 API 요청 |
| user_id | Integer, FK | 사용자 ID |
| session_id | String(100) | 대화 세션 구분 (같은 세션 = 연속 대화) |
| query | Text | 사용자 질문 원문 |
| query_type | String(50) | 질문 유형 (법령, 판례, 사건, 일반) |
| route | String(20) | 라우팅 결과 (general, simple, complex) |
| response | Text | AI 답변 원문 |
| tools_used | JSON | 사용된 도구 목록 (예: ["rag_search", "analyze_case"]) |
| tool_call_count | Integer | 도구 호출 횟수 |
| cited_sources | JSON | 인용된 출처 목록 |
| latency_ms | Integer | 총 응답 시간 (밀리초) |
| created_at | DateTime | 대화 시각 |

**수집 위치**: `/api/v1/agent/chat` 엔드포인트

---

### 테이블 4: `tool_usage_logs` (도구 사용 추적)

**목적**: 홈 에이전트에서 호출된 각 도구의 상세 정보를 기록합니다.

| 컬럼 | 타입 | 설명 |
|-----|-----|-----|
| id | Integer, PK | 기본키 |
| chat_log_id | Integer, FK | 연결된 대화 로그 |
| user_id | Integer, FK | 사용자 ID |
| tool_name | String(100) | 도구 이름 (search_laws, rag_search, analyze_case, compare_precedent 등) |
| input_params | JSON | 도구 입력값 (예: {query: "형법 제307조"}) |
| success | Boolean | 성공 여부 |
| latency_ms | Integer | 도구 실행 시간 (밀리초) |
| created_at | DateTime | 실행 시각 |

**수집 위치**: ToolNode 실행 시 (on_tool_start, on_tool_end 이벤트)

---

## 데이터 수집 흐름

### 1. 일반 API 요청 (예: 사건 목록 조회)

```
사용자 요청: GET /api/v1/cases
    │
    ▼
[미들웨어] api_logs에 기록
    │
    ├── user_id: 1
    ├── endpoint: /api/v1/cases
    ├── method: GET
    ├── latency_ms: 45
    └── status_code: 200
```

### 2. 홈 에이전트 대화 요청

```
사용자 요청: POST /api/v1/agent/chat
    │ body: { message: "명예훼손죄 요건이 뭐야?" }
    │
    ▼
[미들웨어] api_logs에 기록 (api_log_id = 123)
    │
    ▼
[Router] 질문 분류 → "complex"
    │
    ├── llm_usage_logs 기록
    │   ├── api_log_id: 123
    │   ├── model: gpt-4o-mini
    │   ├── purpose: router
    │   └── cost_usd: 0.0001
    │
    ▼
[Agent] 도구 선택 → rag_search
    │
    ├── llm_usage_logs 기록
    │   ├── purpose: agent
    │   └── cost_usd: 0.0003
    │
    ▼
[Tools] rag_search 실행
    │
    ├── tool_usage_logs 기록
    │   ├── tool_name: rag_search
    │   ├── input_params: {query: "명예훼손죄 요건", keyword: "명예훼손"}
    │   ├── success: true
    │   └── latency_ms: 450
    │
    ▼
[Generator] 최종 답변 생성
    │
    ├── llm_usage_logs 기록
    │   ├── model: gpt-4o
    │   ├── purpose: generator
    │   └── cost_usd: 0.0120
    │
    ▼
[응답 완료]
    │
    └── chat_logs 기록
        ├── api_log_id: 123
        ├── query: "명예훼손죄 요건이 뭐야?"
        ├── route: complex
        ├── tools_used: ["rag_search"]
        ├── tool_call_count: 1
        └── latency_ms: 2340
```

---

## 구현 계획

### Phase 1: 기본 로깅 (1주)

| 순서 | 작업 | 파일 |
|-----|-----|-----|
| 1 | 4개 테이블 모델 정의 | `backend/app/models/logs.py` |
| 2 | 마이그레이션 실행 | `alembic revision` |
| 3 | API 로깅 미들웨어 구현 | `backend/app/middleware/api_logger.py` |
| 4 | LLM 비용 로깅 유틸 구현 | `backend/app/services/llm_logger.py` |
| 5 | 홈 에이전트에 chat_logs 저장 로직 추가 | `backend/app/api/v1/agent_api.py` |
| 6 | 도구 실행 시 tool_usage_logs 저장 | `backend/app/home_agent/nodes.py` |

### Phase 2: 외부 도구 연동 (3일)

| 순서 | 작업 |
|-----|-----|
| 1 | Sentry 연동 (Backend + Frontend) | npm install @sentry/react 실행  pip install sentry-sdk 실행
| 2 | PostHog 연동 (Frontend 이벤트 추적) | npm install posthog-js @sentry/react

### Phase 3: 대시보드 & 분석 (1주)

| 순서 | 작업 |
|-----|-----|
| 1 | Grafana Cloud 연동 |
| 2 | 실시간 대시보드 구성 |
| 3 | 분석 쿼리 작성 |

---

## 분석 쿼리 예시

### 1. 가장 많이 호출되는 API TOP 10

```sql
SELECT endpoint, COUNT(*) as call_count, AVG(latency_ms) as avg_latency
FROM api_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY endpoint
ORDER BY call_count DESC
LIMIT 10;
```

### 2. 일별 LLM 비용 추이

```sql
SELECT
    DATE(created_at) as date,
    model,
    SUM(cost_usd) as total_cost,
    SUM(input_tokens + output_tokens) as total_tokens
FROM llm_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), model
ORDER BY date;
```

### 3. 기능별 LLM 비용 분포

```sql
SELECT
    purpose,
    model,
    COUNT(*) as call_count,
    SUM(cost_usd) as total_cost,
    AVG(cost_usd) as avg_cost
FROM llm_usage_logs
GROUP BY purpose, model
ORDER BY total_cost DESC;
```

### 4. 도구별 사용률 및 성공률

```sql
SELECT
    tool_name,
    COUNT(*) as usage_count,
    AVG(latency_ms) as avg_latency,
    SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate
FROM tool_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY tool_name
ORDER BY usage_count DESC;
```

### 5. 라우팅 분포 (질문 유형)

```sql
SELECT
    route,
    COUNT(*) as count,
    AVG(latency_ms) as avg_latency,
    AVG(tool_call_count) as avg_tools
FROM chat_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY route;
```

### 6. 사용자별 LLM 비용 TOP 10

```sql
SELECT
    u.email,
    COUNT(DISTINCT cl.id) as chat_count,
    SUM(ll.cost_usd) as total_cost
FROM llm_usage_logs ll
JOIN users u ON u.id = ll.user_id
JOIN chat_logs cl ON cl.api_log_id = ll.api_log_id
WHERE ll.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email
ORDER BY total_cost DESC
LIMIT 10;
```

### 7. 시간대별 트래픽 패턴

```sql
SELECT
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as request_count
FROM api_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

### 8. 에러율 높은 API

```sql
SELECT
    endpoint,
    COUNT(*) as total_calls,
    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as error_rate
FROM api_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY endpoint
HAVING COUNT(*) > 10
ORDER BY error_rate DESC;
```

---

## 포트폴리오 어필 포인트

### 📈 비즈니스 인사이트 도출

```markdown
## 데이터 기반 서비스 최적화 사례

### 1. LLM 비용 40% 절감
- **발견**: Generator(gpt-4o)가 전체 비용의 65% 차지
- **조치**: General 분기에 gpt-4o-mini 적용
- **결과**: 월 예상 비용 $50 → $30 절감

### 2. 응답 시간 30% 개선
- **발견**: Complex 쿼리 평균 3.5초, Agent 재호출이 병목
- **조치**: 단일 도구 + Complex → Generator 직행 최적화
- **결과**: 평균 응답 시간 3.5초 → 2.4초

### 3. 핵심 기능 파악
- **발견**: rag_search가 전체 도구 사용의 52% 차지
- **인사이트**: 판례/법령 통합 검색이 핵심 기능
- **액션**: rag_search 성능 최적화 우선순위 상향
```

### 📊 대시보드 시각화

```
┌─────────────────────────────────────────────────────────┐
│  📈 AI 어쏘 Analytics Dashboard                         │
├─────────────────────────────────────────────────────────┤
│  Today's Stats                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ DAU      │ │ Queries  │ │ Avg Resp │ │ LLM Cost   │ │
│  │   45     │ │   234    │ │  2.1s    │ │   $3.20    │ │
│  │  (+12%)  │ │  (+8%)   │ │  (-15%)  │ │  (-20%)    │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
├─────────────────────────────────────────────────────────┤
│  Tool Usage Distribution      │  Query Route Distribution│
│  ┌─────────────────────────┐  │  ┌─────────────────────┐│
│  │ rag_search    ████ 52%  │  │  │ Complex  ████ 55%  ││
│  │ search_laws   ██ 20%    │  │  │ Simple   ██ 35%    ││
│  │ analyze_case  █ 12%     │  │  │ General  █ 10%     ││
│  │ list_cases    █ 10%     │  │  │                     ││
│  │ compare       ▌ 6%      │  │  │                     ││
│  └─────────────────────────┘  │  └─────────────────────┘│
├─────────────────────────────────────────────────────────┤
│  LLM Cost by Model (30 days)  │  Response Time (24h)    │
│  ┌─────────────────────────┐  │  ┌─────────────────────┐│
│  │ gpt-4o      ████ $45    │  │  │    ___              ││
│  │ gpt-4o-mini ██ $18      │  │  │ __/   \___/\___    ││
│  │                          │  │  │/              \_   ││
│  │ Total: $63              │  │  │ 0h    12h    24h   ││
│  └─────────────────────────┘  │  └─────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 다음 단계

1. [ ] Phase 1 구현 시작 - 테이블 모델 정의
2. [ ] 미들웨어 구현 및 테스트
3. [ ] Sentry 연동
4. [ ] PostHog 연동
5. [ ] Grafana 대시보드 구성
6. [ ] 1주일 데이터 수집 후 첫 분석 리포트 작성
