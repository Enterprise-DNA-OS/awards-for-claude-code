create schema awards;
revoke all on schema awards from public;
create function awards.touch() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table awards.seasons (
 id uuid primary key default gen_random_uuid(), code text unique not null, name text not null,
 closes_on date not null, judging_due date not null, owner text not null, security_review_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(judging_due>=closes_on)
);
create table awards.categories (
 id uuid primary key default gen_random_uuid(), season_id uuid not null references awards.seasons,
 name text not null, required_judges integer not null default 2 check(required_judges between 1 and 20),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(season_id,id), unique(season_id,name)
);
create table awards.criteria (
 id uuid primary key default gen_random_uuid(), category_id uuid not null references awards.categories,
 name text not null, weight numeric not null check(weight>0 and weight<=100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(category_id,id), unique(category_id,name)
);
create table awards.entries (
 id uuid primary key default gen_random_uuid(), season_id uuid not null references awards.seasons,
 category_id uuid not null, name text not null, entrant text not null, organisation text not null default '',
 status text not null default 'submitted' check(status in ('submitted','in progress','withdrawn')),
 eligibility text not null default 'pending' check(eligibility in ('pending','eligible','ineligible')), eligibility_evidence text,
 decision text not null default 'undecided' check(decision in ('undecided','shortlisted','winner','not selected')), decision_reason text,
 notice_review text, retention_review_on date, source_id text, source_data jsonb, source_hash text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(season_id,id), unique(season_id,source_id), unique(category_id,id),
 foreign key(season_id,category_id) references awards.categories(season_id,id),
 check(eligibility='pending' or length(trim(eligibility_evidence))>0),
 check(decision='undecided' or length(trim(decision_reason))>0)
);
create table awards.judges (
 id uuid primary key default gen_random_uuid(), season_id uuid not null references awards.seasons,
 name text not null, organisation text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(season_id,id)
);
create table awards.assignments (
 id uuid primary key default gen_random_uuid(), season_id uuid not null references awards.seasons,
 category_id uuid not null, entry_id uuid not null, judge_id uuid not null,
 declaration text not null default 'pending' check(declaration in ('pending','clear','conflict')),
 evidence text, due_on date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(entry_id,judge_id), unique(category_id,id),
 foreign key(category_id,entry_id) references awards.entries(category_id,id),
 foreign key(season_id,entry_id) references awards.entries(season_id,id),
 foreign key(season_id,judge_id) references awards.judges(season_id,id),
 check(declaration='pending' or length(trim(evidence))>0)
);
create table awards.scores (
 id uuid primary key default gen_random_uuid(), category_id uuid not null, assignment_id uuid not null, criterion_id uuid not null,
 value numeric not null check(value between 0 and 10), rationale text not null check(length(trim(rationale))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(assignment_id,criterion_id),
 foreign key(category_id,assignment_id) references awards.assignments(category_id,id),
 foreign key(category_id,criterion_id) references awards.criteria(category_id,id)
);
create table awards.activity (
 id uuid primary key default gen_random_uuid(), season_id uuid not null references awards.seasons,
 actor text not null, action text not null, detail text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$ declare t text; begin foreach t in array array['seasons','categories','criteria','entries','judges','assignments','scores','activity'] loop
 execute format('create trigger touch before update on awards.%I for each row execute function awards.touch()',t);
 execute format('alter table awards.%I enable row level security',t);
 execute format('revoke all on awards.%I from public',t);
 end loop; end $$;
create index on awards.entries(category_id);
create index on awards.judges(season_id);
create index on awards.assignments(season_id);
create index on awards.assignments(judge_id);
create index on awards.scores(criterion_id);
create index on awards.activity(season_id,created_at);
create view awards.judging_progress with (security_invoker=true) as
 select a.id,a.season_id,a.entry_id,a.judge_id,e.name as entry,c.name as category,j.name as judge,a.declaration,a.due_on,
 (select count(*) from awards.criteria x where x.category_id=a.category_id) as criteria_required,
 count(s.id) as criteria_scored,
 case when a.declaration='clear' and count(s.id)>0 and count(s.id)=(select count(*) from awards.criteria x where x.category_id=a.category_id)
 then round(sum(s.value*x.weight)/sum(x.weight),4) end as weighted_score
 from awards.assignments a join awards.entries e on e.id=a.entry_id join awards.categories c on c.id=a.category_id
 join awards.judges j on j.id=a.judge_id left join awards.scores s on s.assignment_id=a.id left join awards.criteria x on x.id=s.criterion_id
 group by a.id,e.name,c.name,j.name;
create view awards.results with (security_invoker=true) as
 select e.id,e.season_id,e.category_id,e.name as entry,c.name as category,e.eligibility,e.status,e.decision,c.required_judges,
 count(p.id) filter(where p.declaration<>'conflict') as assigned,
 count(p.weighted_score) as completed,
 round(avg(p.weighted_score),4) as mean_score,
 coalesce(round(max(p.weighted_score)-min(p.weighted_score),4),0) as judge_spread,
 (e.status='submitted' and e.eligibility='eligible' and count(p.weighted_score)>=c.required_judges
 and count(p.weighted_score)=count(p.id) filter(where p.declaration<>'conflict')) as ready
 from awards.entries e join awards.categories c on c.id=e.category_id left join awards.judging_progress p on p.entry_id=e.id
 group by e.id,c.name,c.required_judges;
create view awards.attention with (security_invoker=true) as
 select e.season_id,'eligibility'::text as kind,e.name as item,'Review entry evidence'::text as next_step from awards.entries e where e.status='submitted' and e.eligibility='pending'
 union all select p.season_id,'declaration',p.entry||' / '||p.judge,'Record a conflict declaration' from awards.judging_progress p where p.declaration='pending'
 union all select p.season_id,'overdue judging',p.entry||' / '||p.judge,'Collect remaining scores' from awards.judging_progress p where p.due_on<current_date and p.declaration='clear' and p.weighted_score is null
 union all select r.season_id,'panel shortage',r.entry,'Assign another independent judge' from awards.results r where r.status='submitted' and r.eligibility='eligible' and r.assigned<r.required_judges;
create view awards.compliance with (security_invoker=true) as
 select season_id,'notice review'::text as rule,name as item,'Assess collection and imported notice obligations'::text as action from awards.entries where nullif(trim(notice_review),'') is null
 union all select season_id,'retention review',name,'Review purpose, holds and disposal with owner' from awards.entries where retention_review_on is null or retention_review_on<=current_date
 union all select id,'security review',name,'Review access, backups and disclosure controls' from awards.seasons where security_review_on is null or security_review_on<current_date-90;
revoke all on all tables in schema awards from public;
