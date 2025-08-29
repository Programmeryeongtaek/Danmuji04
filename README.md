# 단무지 (Danmuji) - 온라인 학습 플랫폼

斷(끊을 단) + 무지(無知): 무지를 끊다.
기본적인 인문학 코스들을 수료하고 도서 추천과 스터디 모임에 참여하는 교육 플랫폼

## 📖 프로젝트 개요 
https://young-taek.tistory.com/501

10여년 간 여러 독서 모임과 인문학 중심의 스터디 모임을 운영해왔다.
모임들을 진행하면서 반복되는 문제가 있었다.

1. 어디부터 공부하면 좋을지 쉽게 선택하지 못한다. 가이드라인을 원한다.
2. 공부한 것을 체계적으로 기록하지 못한다.
3. 기록한 것을 분실한다.
4. 공부 흐름이 끊겨 처음부터 다시 공부한다.

그래서 이를 해결하기 위해, 학습 플랫폼을 만들었다.
1. 특정 키워드 중심으로 좋은 유튜브 영상들을 모아 코스를 만들었다.
2. 코스를 수료하면 수료증이 나오고, 자신이 정리한 내용들을 확인할 수 있다.
3. 이로 인해, 기록을 분실하거나 처음부터 다시 공부하는 문제를 해결할 수 있다.

## ✨ 주요 기능

### 🎓 강의 시청 (Knowledge)
- YouTube 기반의 온라인 강의 제공
- 독서, 글쓰기, 질문 카테고리별 체계적인 커리큘럼
- 강의 진도 관리 및 수료증 발급
- 수강평 및 평점 시스템

### 📚 코스 관리 (Course)
- 섹션별로 구조화된 코스 제공
- 강의 아이템별 상세 정보 및 키워드 관리
- 수강 진도 추적 및 완료율 관리
- 학습 글쓰기 기능

### 👥 스터디 모임 (Study)
- 온라인/오프라인 스터디 그룹 생성 및 참여
- 도서 기반 독서 모임
- 실시간 채팅 기능
- 참여자 관리 및 승인 시스템

### 💬 커뮤니티 (Community)
- 카테고리별 게시글 작성 및 댓글
- 태그 시스템 및 검색 기능
- 좋아요, 북마크 기능
- 사용자 간 소통 및 정보 공유

### 👤 사용자 관리
- 프로필 관리 및 학습 현황 대시보드
- 알림 시스템
- 수료증 관리
- 학습 통계 및 진도 추적

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 15.1.3 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Jotai
- **Icons**: Lucide React

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### Development Tools
- **Package Manager**: pnpm
- **Code Quality**: ESLint, Prettier
- **Development**: Turbopack (Next.js)

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.0 이상
- pnpm 9.2.0 이상
- Supabase 프로젝트

### 설치

1. 저장소 클론
```bash
git clone [repository-url]
cd danmuji04
```

2. 의존성 설치
```bash
pnpm install
```

3. 환경 변수 설정
```bash
cp .env.example .env.local
```

`.env.local` 파일에 다음 환경 변수를 설정하세요:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. 개발 서버 실행
```bash
pnpm dev
```

### 빌드 및 배포

```bash
# 프로덕션 빌드
pnpm build

# 프로덕션 서버 실행
pnpm start
```

## 🗄️ 데이터베이스 스키마

### 주요 테이블

- **profiles**: 사용자 프로필 정보
- **courses**: 코스 정보
- **course_sections**: 코스 섹션
- **course_items**: 강의 아이템
- **course_progress**: 수강 진도
- **course_writings**: 학습 글쓰기
- **studies**: 스터디 정보
- **study_participants**: 스터디 참여자
- **books**: 도서 정보
- **posts**: 커뮤니티 게시글
- **comments**: 댓글
- **notifications**: 알림
- **certificates**: 수료증

## 📱 주요 기능 상세

### 강의 시청 시스템
- YouTube API 연동으로 동영상 재생
- 시청 진도 자동 저장
- 강의별 메모 및 리뷰 작성
- 카테고리별 학습 진행률 추적

### 스터디 관리
- 온라인/오프라인 모임 구분
- 정원 관리 및 참여 승인 시스템
- 실시간 채팅 기능 (Supabase Realtime)
- 도서 기반 독서 모임 지원

### 커뮤니티 시스템
- 마크다운 기반 게시글 작성
- 태그 기반 분류 및 검색
- 댓글 및 대댓글 시스템
- 좋아요 및 북마크 기능

### 알림 시스템
- 실시간 알림 (Supabase Realtime)
- 스터디 관련 알림
- 커뮤니티 활동 알림
- 학습 진도 알림

## 🔧 커스텀 훅

- **useSupabase**: Supabase 클라이언트 및 인증 관리
- **useForm**: 폼 제출 및 파일 업로드 관리
- **useInfiniteScroll**: 무한 스크롤 구현

## 🎨 UI/UX

- 반응형 디자인 (모바일, 태블릿, 데스크톱 대응)
- 다크 모드 지원 (예정)
- 접근성 고려한 디자인
- 직관적인 네비게이션

## 📈 성능 최적화

- Next.js App Router 활용
- 이미지 최적화 (Next.js Image 컴포넌트)
- 코드 스플리팅
- 무한 스크롤을 통한 효율적인 데이터 로딩
- GraphQL 도입을 통한 네트워크 요청 감소
- Jotai 도입을 통한 전역상태 관리로 중복 호출 제거
- TanStack Query 도입으로 캐싱하여 네트워크 요청 감소

---

**단무지**와 함께 더 나은 학습 여정을 시작하세요! 📚✨
