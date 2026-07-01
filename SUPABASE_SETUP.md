# 회원 기능(Supabase) 설정 가이드

꿈들 홈페이지의 **회원가입·로그인·회원제 프로젝트 글쓰기·강의 신청·관리자 회원관리**는
무료 백엔드 **Supabase** 로 동작합니다. 아래 순서대로 한 번만 설정하면 됩니다.

---

## 1. Supabase 프로젝트 만들기 (무료)
1. https://supabase.com 접속 → 가입/로그인
2. **New project** 생성 (Region은 `Northeast Asia (Seoul)` 권장)
3. 생성 후 **Project Settings → API** 에서 두 값을 복사:
   - **Project URL**  (예: `https://abcdxyz.supabase.co`)
   - **anon public** key (`eyJ...` 로 시작하는 긴 문자열)
   > anon 키는 공개돼도 안전합니다. 보안은 아래 RLS 정책이 담당합니다.

## 2. 키 입력
저장소의 **`assets/config.js`** 를 열어 붙여넣고 커밋합니다.
```js
window.KKUMDLE_CONFIG = {
  SUPABASE_URL: "https://abcdxyz.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJI...",
  APPLY_TO_SUPABASE: true
};
```

## 3. 데이터베이스 만들기 (SQL)
Supabase → **SQL Editor** → New query 에 아래를 **전체 복사·실행**합니다.

```sql
-- 회원 프로필
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  phone text,
  role text not null default 'member',   -- 'member' | 'admin'
  created_at timestamptz not null default now()
);

-- 프로젝트 게시판(회원 글)
create table if not exists public.project_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- 강의·프로그램 신청
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  program text,
  name text,
  phone text,
  message text,
  created_at timestamptz not null default now()
);

-- 관리자 여부 helper
create or replace function public.is_admin() returns boolean
language sql security definer stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- RLS 활성화
alter table public.profiles      enable row level security;
alter table public.project_posts  enable row level security;
alter table public.applications   enable row level security;

-- profiles 정책
create policy "본인 프로필 조회" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "본인 프로필 생성" on public.profiles for insert with check (auth.uid() = id);
create policy "본인 프로필 수정" on public.profiles for update using (auth.uid() = id);
create policy "관리자 프로필 수정" on public.profiles for update using (public.is_admin());

-- project_posts 정책: 누구나 읽기, 회원만 작성(본인), 본인/관리자 삭제·수정
create policy "게시글 공개 조회" on public.project_posts for select using (true);
create policy "회원 게시글 작성" on public.project_posts for insert with check (auth.uid() = author_id);
create policy "본인/관리자 게시글 수정" on public.project_posts for update using (auth.uid() = author_id or public.is_admin());
create policy "본인/관리자 게시글 삭제" on public.project_posts for delete using (auth.uid() = author_id or public.is_admin());

-- applications 정책: 누구나(비회원 포함) 신청 등록, 관리자만 조회
create policy "누구나 신청 등록" on public.applications for insert with check (true);
create policy "관리자만 신청 조회" on public.applications for select using (public.is_admin());
```

## 4. 이메일 인증(선택)
기본적으로 Supabase는 가입 시 이메일 인증을 요구할 수 있습니다.
- 테스트/간편 운영: **Authentication → Providers → Email → "Confirm email" 끄기**
- 정식 운영: 그대로 두고, 안내 메일의 링크로 인증

## 5. 관리자 지정
관리자로 쓸 계정으로 홈페이지에서 **회원가입**한 뒤,
Supabase **SQL Editor** 에서 아래 실행(이메일만 본인 것으로):
```sql
update public.profiles set role = 'admin' where email = '관리자이메일@example.com';
```
이제 그 계정으로 로그인하면 상단 메뉴에 **관리** 링크가 보이고,
`admin.html` 에서 회원·신청·게시글을 관리할 수 있습니다.

---

## 동작 요약
| 기능 | 페이지 | 권한 |
|------|--------|------|
| 회원가입·로그인 | `login.html` | 누구나 |
| 프로젝트 글쓰기 | `write.html` | 로그인 회원 |
| 프로젝트 글 보기 | `projects.html` | 누구나 |
| 강의·프로그램 신청 | `projects.html` (하단 폼) | 누구나 |
| 회원·신청·글 관리 | `admin.html` | 관리자 |

> 설정 전에도 사이트는 정상 동작하며, 회원 기능만 "준비 중"으로 안내됩니다.
> 설정 후에는 자동으로 활성화됩니다.
