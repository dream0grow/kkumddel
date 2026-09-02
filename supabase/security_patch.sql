-- =====================================================================
-- 꿈들 홈페이지 — 회원 데이터 보호 보안 패치 (2026-09)
-- Supabase → SQL Editor → New query 에 전체 복사 후 Run 1회 실행
-- 여러 번 실행해도 안전합니다(멱등).
-- 자세한 설명: 저장소의 SECURITY.md 참고
-- =====================================================================

-- ---------------------------------------------------------------
-- [1] 신청자 연락처 보호
--     기존: 로그인 회원 누구나 applications 원본(연락처·메시지 포함)을
--           DB에서 직접 읽을 수 있었음 (화면에서만 가려짐 = 불충분)
--     변경: 원본 테이블은 관리자만 조회.
--           일반 회원은 개인정보를 가린 뷰(applications_board)만 조회.
-- ---------------------------------------------------------------
drop policy if exists "회원 신청 조회" on public.applications;
drop policy if exists "관리자만 신청 조회" on public.applications;
create policy "관리자만 신청 조회" on public.applications
  for select using (public.is_admin());

-- 이름 가림 함수: "홍길동" → "홍*동", "이도" → "이*"
create or replace function public.mask_name(n text) returns text
language sql immutable
set search_path = public
as $$
  select case
    when n is null or length(trim(n)) = 0 then '(무명)'
    when length(trim(n)) = 1 then trim(n) || '*'
    when length(trim(n)) = 2 then substr(trim(n),1,1) || '*'
    else substr(trim(n),1,1) || repeat('*', length(trim(n))-2) || substr(trim(n), length(trim(n)), 1)
  end;
$$;

-- 일반 회원용 신청 현황 뷰(연락처·메시지 제외, 이름 가림)
drop view if exists public.applications_board;
create view public.applications_board as
  select id, program, public.mask_name(name) as name, created_at
  from public.applications;

-- 뷰는 로그인한 회원만 조회 가능 (비로그인·외부인 차단)
revoke all on public.applications_board from anon, authenticated;
grant select on public.applications_board to authenticated;

-- 관리자용 파기(삭제) 정책 — 보유기간 지난 신청 데이터 정리용
drop policy if exists "관리자 신청 삭제" on public.applications;
create policy "관리자 신청 삭제" on public.applications
  for delete using (public.is_admin());

-- ---------------------------------------------------------------
-- [2] security definer 함수의 search_path 고정
--     (스키마 바꿔치기 공격 차단 — Supabase 보안 권고 사항)
-- ---------------------------------------------------------------
alter function public.is_admin() set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.protect_role() set search_path = public;

-- ---------------------------------------------------------------
-- [3] 입력 길이 제한 (도배·초대용량 입력으로 인한 오남용 방지)
-- ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_len_chk') then
    alter table public.profiles add constraint profiles_len_chk check (
      coalesce(length(name),0)  <= 50 and
      coalesce(length(phone),0) <= 20 and
      coalesce(length(email),0) <= 254
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'applications_len_chk') then
    alter table public.applications add constraint applications_len_chk check (
      coalesce(length(program),0) <= 100 and
      coalesce(length(name),0)    <= 50  and
      coalesce(length(phone),0)   <= 20  and
      coalesce(length(message),0) <= 2000
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'project_posts_len_chk') then
    alter table public.project_posts add constraint project_posts_len_chk check (
      length(title) <= 200 and
      length(body)  <= 20000 and
      coalesce(length(author_name),0) <= 50
    );
  end if;
end $$;

-- ---------------------------------------------------------------
-- [4] 게시글 도배 방지 — 회원 1명당 5분에 3건까지 작성 허용
-- ---------------------------------------------------------------
create or replace function public.check_post_rate() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if (select count(*) from public.project_posts
      where author_id = new.author_id
        and created_at > now() - interval '5 minutes') >= 3 then
    raise exception '글을 너무 자주 올리고 있습니다. 잠시 후 다시 시도해 주세요.';
  end if;
  return new;
end $$;
drop trigger if exists trg_post_rate on public.project_posts;
create trigger trg_post_rate before insert on public.project_posts
  for each row execute function public.check_post_rate();

-- ---------------------------------------------------------------
-- [5] 관리자 권한 부여 이력 남기기 (누가 언제 role을 바꿨는지 기록)
-- ---------------------------------------------------------------
create table if not exists public.role_audit (
  id bigint generated always as identity primary key,
  target_id uuid,
  old_role text,
  new_role text,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
alter table public.role_audit enable row level security;
drop policy if exists "관리자만 이력 조회" on public.role_audit;
create policy "관리자만 이력 조회" on public.role_audit
  for select using (public.is_admin());

create or replace function public.log_role_change() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into public.role_audit (target_id, old_role, new_role, changed_by)
    values (new.id, old.role, new.role, auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists trg_role_audit on public.profiles;
create trigger trg_role_audit after update on public.profiles
  for each row execute function public.log_role_change();

-- ---------------------------------------------------------------
-- [6] 점검 쿼리 (실행 후 결과 확인용 — 필요할 때 주석 해제)
-- ---------------------------------------------------------------
-- 관리자 계정 목록 점검(모르는 계정이 있으면 즉시 member로 내리세요)
-- select id, email, role, created_at from public.profiles where role = 'admin';
-- RLS 활성화 여부 점검(모두 true 여야 정상)
-- select relname, relrowsecurity from pg_class
--  where relname in ('profiles','applications','project_posts','role_audit');
