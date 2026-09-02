# 회원 기능(Supabase) 설정 가이드

꿈들 홈페이지의 **회원가입·로그인·회원제 프로젝트 글쓰기·강의 신청·관리자 회원관리**는
무료 백엔드 **Supabase** 로 동작합니다. 아래 순서대로 한 번만 설정하면 됩니다.

> 🔒 **보안 조치는 [`SECURITY.md`](SECURITY.md) 를 함께 보세요.**
> 설치 후 반드시 **`supabase/security_patch.sql`** 을 SQL Editor에서 1회 실행해야
> 신청자 연락처 보호·도배 방지·권한 변경 기록 등이 적용됩니다.

## ⚠️ "가입 실패: Failed to fetch" 가 뜰 때
서버에 연결하지 못했다는 뜻입니다. 대부분 **무료 프로젝트가 1주일 이상 사용되지 않아
일시중지(Paused)된 경우**입니다. https://supabase.com/dashboard 접속 → 프로젝트 클릭 →
**Restore project** 버튼을 누르면 1~2분 안에 복구되며 데이터는 사라지지 않습니다.
(자세한 진단 순서: `SECURITY.md` 0장)

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

-- 회원가입 시 프로필 자동 생성 (이메일 인증 켜져 있어도 안전하게 생성됨)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, phone, role)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'name', new.email),
          coalesce(new.raw_user_meta_data->>'phone', ''),
          'member')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS 활성화
alter table public.profiles      enable row level security;
alter table public.project_posts  enable row level security;
alter table public.applications   enable row level security;

-- profiles 정책
create policy "본인 프로필 조회" on public.profiles for select using (auth.uid() = id or public.is_admin());
-- 가입 시 role은 반드시 'member' (스스로 admin 지정 차단)
create policy "본인 프로필 생성" on public.profiles for insert with check (auth.uid() = id and role = 'member');
create policy "본인 프로필 수정" on public.profiles for update using (auth.uid() = id);
create policy "관리자 프로필 수정" on public.profiles for update using (public.is_admin());

-- 본인 프로필 수정 시 role(권한) 변경 차단 — 관리자 또는 서버(SQL editor)만 role 변경 가능
create or replace function public.protect_role() returns trigger
language plpgsql security definer as $$
begin
  if (auth.uid() is not null) and (not public.is_admin())
     and (new.role is distinct from old.role) then
    new.role := old.role;  -- 일반 회원의 role 변경 시도를 무시
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_role on public.profiles;
create trigger trg_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- project_posts 정책: 누구나 읽기, 회원만 작성(본인), 본인/관리자 삭제·수정
create policy "게시글 공개 조회" on public.project_posts for select using (true);
create policy "회원 게시글 작성" on public.project_posts for insert with check (auth.uid() = author_id);
create policy "본인/관리자 게시글 수정" on public.project_posts for update using (auth.uid() = author_id or public.is_admin());
create policy "본인/관리자 게시글 삭제" on public.project_posts for delete using (auth.uid() = author_id or public.is_admin());

-- applications 정책: 누구나(비회원 포함) 신청 등록, 로그인 회원만 조회(비로그인 차단)
create policy "누구나 신청 등록" on public.applications for insert with check (true);
create policy "회원 신청 조회" on public.applications for select using (auth.uid() is not null);
```

### 🔒 (구버전 안내 대체) 신청 현황 열람은 보안 패치로 처리합니다
과거 안내에서는 "회원 신청 조회" 정책으로 로그인 회원이 신청 원본(연락처 포함)을 읽을 수 있었으나,
개인정보 보호를 위해 **`supabase/security_patch.sql`** 로 대체되었습니다. 패치를 실행하면:
- 원본 `applications`(연락처·메시지 포함)는 **관리자만** 조회
- 일반 회원은 연락처가 제외되고 이름이 가려진(홍*동) **`applications_board` 뷰**만 조회
- 홈페이지 화면(apply.html)은 자동으로 뷰를 사용하도록 이미 수정되어 있습니다.

## 🔒 이미 예전 SQL을 실행하셨다면 — 보안 패치(권한 상승 차단)
초기 정책에는 일반 회원이 스스로 `role='admin'`으로 올릴 수 있는 허점이 있었습니다.
아래를 **SQL Editor에 한 번 실행**하면 막힙니다. (신규 설치는 위 SQL에 이미 포함)
```sql
-- 1) 가입 시 role을 'member'로 고정
drop policy if exists "본인 프로필 생성" on public.profiles;
create policy "본인 프로필 생성" on public.profiles
  for insert with check (auth.uid() = id and role = 'member');

-- 2) 본인 프로필 수정 시 role 변경 차단(관리자/서버만 허용)
create or replace function public.protect_role() returns trigger
language plpgsql security definer as $$
begin
  if (auth.uid() is not null) and (not public.is_admin())
     and (new.role is distinct from old.role) then
    new.role := old.role;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_role on public.profiles;
create trigger trg_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- 3) 혹시 잘못 올라간 관리자 계정이 있는지 점검(관리자로 둘 계정만 남기세요)
--    select id, email, role from public.profiles where role = 'admin';
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

> **프로필 줄이 없어서 위 update가 0건이면**(이메일 인증 켠 상태로 먼저 가입한 경우),
> 아래처럼 프로필을 만들면서 관리자로 지정하세요:
> ```sql
> insert into public.profiles (id, email, name, role)
> select id, email, coalesce(raw_user_meta_data->>'name', email), 'admin'
> from auth.users where email = '관리자이메일@example.com'
> on conflict (id) do update set role = 'admin';
> ```

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
