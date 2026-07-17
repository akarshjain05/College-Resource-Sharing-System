--
-- PostgreSQL database dump
--

\restrict ZGlW1XkZZ6ghBN0V9MgqUGGmp4LrbJATsuipHfdLXODHCIBgNI7tsiHVaZqp1bT

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.wanted_requests DROP CONSTRAINT wanted_requests_user_id_fkey;
ALTER TABLE ONLY public.wanted_requests DROP CONSTRAINT wanted_requests_category_id_fkey;
ALTER TABLE ONLY public.reviews DROP CONSTRAINT reviews_reviewer_id_fkey;
ALTER TABLE ONLY public.reviews DROP CONSTRAINT reviews_resource_id_fkey;
ALTER TABLE ONLY public.resources DROP CONSTRAINT resources_owner_id_fkey;
ALTER TABLE ONLY public.resources DROP CONSTRAINT resources_category_id_fkey;
ALTER TABLE ONLY public.resource_images DROP CONSTRAINT resource_images_resource_id_fkey;
ALTER TABLE ONLY public.notifications DROP CONSTRAINT notifications_user_id_fkey;
ALTER TABLE ONLY public.complaints DROP CONSTRAINT complaints_resource_id_fkey;
ALTER TABLE ONLY public.complaints DROP CONSTRAINT complaints_filed_by_id_fkey;
ALTER TABLE ONLY public.complaints DROP CONSTRAINT complaints_borrow_request_id_fkey;
ALTER TABLE ONLY public.complaints DROP CONSTRAINT complaints_against_user_id_fkey;
ALTER TABLE ONLY public.categories DROP CONSTRAINT categories_parent_id_fkey;
ALTER TABLE ONLY public.borrow_requests DROP CONSTRAINT borrow_requests_resource_id_fkey;
ALTER TABLE ONLY public.borrow_requests DROP CONSTRAINT borrow_requests_lender_id_fkey;
ALTER TABLE ONLY public.borrow_requests DROP CONSTRAINT borrow_requests_borrower_id_fkey;
ALTER TABLE ONLY public.audit_logs DROP CONSTRAINT audit_logs_actor_id_fkey;
DROP INDEX public.ix_wanted_requests_id;
DROP INDEX public.ix_users_id;
DROP INDEX public.ix_users_google_id;
DROP INDEX public.ix_users_email;
DROP INDEX public.ix_reviews_id;
DROP INDEX public.ix_resources_title;
DROP INDEX public.ix_resources_status;
DROP INDEX public.ix_resources_id;
DROP INDEX public.ix_resource_images_id;
DROP INDEX public.ix_notifications_id;
DROP INDEX public.ix_complaints_id;
DROP INDEX public.ix_categories_slug;
DROP INDEX public.ix_categories_id;
DROP INDEX public.ix_borrow_requests_status;
DROP INDEX public.ix_borrow_requests_id;
DROP INDEX public.ix_audit_logs_id;
ALTER TABLE ONLY public.wanted_requests DROP CONSTRAINT wanted_requests_pkey;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_student_id_key;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
ALTER TABLE ONLY public.reviews DROP CONSTRAINT reviews_pkey;
ALTER TABLE ONLY public.resources DROP CONSTRAINT resources_pkey;
ALTER TABLE ONLY public.resources DROP CONSTRAINT resources_barcode_key;
ALTER TABLE ONLY public.resource_images DROP CONSTRAINT resource_images_pkey;
ALTER TABLE ONLY public.notifications DROP CONSTRAINT notifications_pkey;
ALTER TABLE ONLY public.complaints DROP CONSTRAINT complaints_pkey;
ALTER TABLE ONLY public.categories DROP CONSTRAINT categories_pkey;
ALTER TABLE ONLY public.categories DROP CONSTRAINT categories_name_key;
ALTER TABLE ONLY public.borrow_requests DROP CONSTRAINT borrow_requests_pkey;
ALTER TABLE ONLY public.audit_logs DROP CONSTRAINT audit_logs_pkey;
ALTER TABLE ONLY public.alembic_version DROP CONSTRAINT alembic_version_pkc;
DROP TABLE public.wanted_requests;
DROP TABLE public.users;
DROP TABLE public.reviews;
DROP TABLE public.resources;
DROP TABLE public.resource_images;
DROP TABLE public.notifications;
DROP TABLE public.complaints;
DROP TABLE public.categories;
DROP TABLE public.borrow_requests;
DROP TABLE public.audit_logs;
DROP TABLE public.alembic_version;
DROP TYPE public.userrole;
DROP TYPE public.resourcestatus;
DROP TYPE public.resourcecondition;
DROP TYPE public.notificationtype;
DROP TYPE public.complaintstatus;
DROP TYPE public.borrowstatus;
DROP TYPE public.authprovider;
--
-- Name: authprovider; Type: TYPE; Schema: public; Owner: crss_user
--

CREATE TYPE public.authprovider AS ENUM (
    'local',
    'google'
);


ALTER TYPE public.authprovider OWNER TO crss_user;

--
-- Name: borrowstatus; Type: TYPE; Schema: public; Owner: crss_user
--

CREATE TYPE public.borrowstatus AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
    'ACTIVE',
    'RETURN_REQUESTED',
    'RETURNED',
    'LATE',
    'DAMAGED'
);


ALTER TYPE public.borrowstatus OWNER TO crss_user;

--
-- Name: complaintstatus; Type: TYPE; Schema: public; Owner: crss_user
--

CREATE TYPE public.complaintstatus AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public.complaintstatus OWNER TO crss_user;

--
-- Name: notificationtype; Type: TYPE; Schema: public; Owner: crss_user
--

CREATE TYPE public.notificationtype AS ENUM (
    'BORROW_REQUEST',
    'BORROW_APPROVED',
    'BORROW_REJECTED',
    'RETURN_REMINDER',
    'RETURN_CONFIRMED',
    'NEW_REVIEW',
    'SYSTEM'
);


ALTER TYPE public.notificationtype OWNER TO crss_user;

--
-- Name: resourcecondition; Type: TYPE; Schema: public; Owner: crss_user
--

CREATE TYPE public.resourcecondition AS ENUM (
    'NEW',
    'GOOD',
    'FAIR',
    'WORN'
);


ALTER TYPE public.resourcecondition OWNER TO crss_user;

--
-- Name: resourcestatus; Type: TYPE; Schema: public; Owner: crss_user
--

CREATE TYPE public.resourcestatus AS ENUM (
    'AVAILABLE',
    'BORROWED',
    'UNAVAILABLE',
    'PENDING_APPROVAL'
);


ALTER TYPE public.resourcestatus OWNER TO crss_user;

--
-- Name: userrole; Type: TYPE; Schema: public; Owner: crss_user
--

CREATE TYPE public.userrole AS ENUM (
    'STUDENT',
    'FACULTY',
    'CLUB',
    'ADMIN'
);


ALTER TYPE public.userrole OWNER TO crss_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: crss_user
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO crss_user;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: crss_user
--

CREATE TABLE public.audit_logs (
    actor_id uuid,
    action character varying(150) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(100),
    details text,
    ip_address character varying(50),
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO crss_user;

--
-- Name: borrow_requests; Type: TABLE; Schema: public; Owner: crss_user
--

CREATE TABLE public.borrow_requests (
    resource_id uuid NOT NULL,
    borrower_id uuid NOT NULL,
    lender_id uuid NOT NULL,
    status public.borrowstatus NOT NULL,
    requested_start_date date NOT NULL,
    requested_end_date date NOT NULL,
    actual_return_date date,
    purpose text,
    deposit_paid numeric(10,2),
    damage_report text,
    rejection_reason text,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    borrower_rating integer,
    lender_rating integer
);


ALTER TABLE public.borrow_requests OWNER TO crss_user;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: crss_user
--

CREATE TABLE public.categories (
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description character varying(500),
    icon character varying(100),
    parent_id uuid,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO crss_user;

--
-- Name: complaints; Type: TABLE; Schema: public; Owner: crss_user
--

CREATE TABLE public.complaints (
    filed_by_id uuid NOT NULL,
    against_user_id uuid,
    resource_id uuid,
    subject character varying(200) NOT NULL,
    description text NOT NULL,
    status public.complaintstatus NOT NULL,
    admin_response text,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    borrow_request_id uuid
);


ALTER TABLE public.complaints OWNER TO crss_user;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: crss_user
--

CREATE TABLE public.notifications (
    user_id uuid NOT NULL,
    type public.notificationtype NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    is_read boolean NOT NULL,
    link character varying(500),
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO crss_user;

--
-- Name: resource_images; Type: TABLE; Schema: public; Owner: crss_user
--

CREATE TABLE public.resource_images (
    resource_id uuid NOT NULL,
    image_url character varying(500) NOT NULL,
    is_primary boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.resource_images OWNER TO crss_user;

--
-- Name: resources; Type: TABLE; Schema: public; Owner: crss_user
--

CREATE TABLE public.resources (
    title character varying(200) NOT NULL,
    description text NOT NULL,
    condition public.resourcecondition NOT NULL,
    status public.resourcestatus NOT NULL,
    quantity integer NOT NULL,
    quantity_available integer NOT NULL,
    pickup_location character varying(200),
    tags character varying(500),
    barcode character varying(100),
    qr_code_url character varying(500),
    deposit_amount numeric(10,2),
    max_borrow_days integer NOT NULL,
    average_rating numeric(3,2) NOT NULL,
    total_borrows integer NOT NULL,
    view_count integer NOT NULL,
    owner_id uuid NOT NULL,
    category_id uuid NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.resources OWNER TO crss_user;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: crss_user
--

CREATE TABLE public.reviews (
    resource_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reviews OWNER TO crss_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: crss_user
--

CREATE TABLE public.users (
    full_name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    hashed_password character varying(255),
    role public.userrole NOT NULL,
    student_id character varying(50),
    department character varying(100),
    course character varying(100),
    year_of_study integer,
    bio text,
    skills text,
    profile_picture_url character varying(500),
    phone_number character varying(20),
    is_verified boolean NOT NULL,
    is_active boolean NOT NULL,
    is_suspended boolean NOT NULL,
    trust_score integer NOT NULL,
    sharing_score integer NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    auth_provider public.authprovider DEFAULT 'local'::public.authprovider NOT NULL,
    google_id character varying(255)
);


ALTER TABLE public.users OWNER TO crss_user;

--
-- Name: wanted_requests; Type: TABLE; Schema: public; Owner: crss_user
--

CREATE TABLE public.wanted_requests (
    user_id uuid NOT NULL,
    title character varying(100) NOT NULL,
    description character varying(1000),
    category_id uuid NOT NULL,
    is_fulfilled boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wanted_requests OWNER TO crss_user;

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: crss_user
--

COPY public.alembic_version (version_num) FROM stdin;
b0e53ea6347d
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: crss_user
--

COPY public.audit_logs (actor_id, action, entity_type, entity_id, details, ip_address, id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: borrow_requests; Type: TABLE DATA; Schema: public; Owner: crss_user
--

COPY public.borrow_requests (resource_id, borrower_id, lender_id, status, requested_start_date, requested_end_date, actual_return_date, purpose, deposit_paid, damage_report, rejection_reason, id, created_at, updated_at, borrower_rating, lender_rating) FROM stdin;
b50df7ac-68e4-4926-ab57-73d5d4aaa12e	2a77e5b8-aa8e-4695-a630-aadc68a9a2a2	09120b82-0323-4da2-bba8-cc7745635abc	APPROVED	2026-07-16	2026-07-30	\N		0.00	\N	\N	3a897d65-fc8e-4338-b5c3-dd09aff94202	2026-07-10 14:23:35.085543+00	2026-07-10 14:24:16.347128+00	\N	\N
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: crss_user
--

COPY public.categories (name, slug, description, icon, parent_id, id, created_at, updated_at) FROM stdin;
Electronics	electronics	Cameras, laptops, monitors, and gadgets	cpu	\N	b89ce10d-a2d6-48b2-84d2-40db28293aa9	2026-07-02 08:30:02.302972+00	2026-07-02 08:30:02.302972+00
Lab Equipment	lab-equipment	Soldering stations, multimeters, sensors	flask-conical	\N	c1f5c7bf-dfc6-4d64-84cf-38a7e0a460af	2026-07-02 08:30:02.302972+00	2026-07-02 08:30:02.302972+00
Sports Equipment	sports-equipment	Balls, rackets, gym gear	dumbbell	\N	9cdfadf3-bcb9-405a-aa14-4f2f13a1af02	2026-07-02 08:30:02.302972+00	2026-07-02 08:30:02.302972+00
Books & References	books-references	Textbooks and reference material	book-open	\N	ba7178be-c98e-4fe3-b07b-c44dc703efcf	2026-07-02 08:30:02.302972+00	2026-07-02 08:30:02.302972+00
Stationery & Tools	stationery-tools	Calculators, drafting tools, extension boards	ruler	\N	26cbd68c-d4ad-4b22-97b3-314669e4d7b8	2026-07-02 08:30:02.302972+00	2026-07-02 08:30:02.302972+00
\.


--
-- Data for Name: complaints; Type: TABLE DATA; Schema: public; Owner: crss_user
--

COPY public.complaints (filed_by_id, against_user_id, resource_id, subject, description, status, admin_response, id, created_at, updated_at, borrow_request_id) FROM stdin;
09120b82-0323-4da2-bba8-cc7745635abc	\N	\N	abc	aaaaaaaaaaaaaa	OPEN	\N	0e56f50c-c865-4be7-8ff4-9d99554ebede	2026-07-05 09:35:13.509696+00	2026-07-05 09:35:13.509696+00	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: crss_user
--

COPY public.notifications (user_id, type, title, message, is_read, link, id, created_at, updated_at) FROM stdin;
09120b82-0323-4da2-bba8-cc7745635abc	BORROW_REQUEST	New borrow request	Akarsh Jain wants to borrow 'cycle'.	t	/borrow-requests/3a897d65-fc8e-4338-b5c3-dd09aff94202	d819af59-735e-44a7-a7f6-b7c29a6d4836	2026-07-10 14:23:35.10091+00	2026-07-10 14:24:04.727695+00
2a77e5b8-aa8e-4695-a630-aadc68a9a2a2	BORROW_APPROVED	Borrow request approved	Your request to borrow 'cycle' was approved.	f	/borrow-requests/3a897d65-fc8e-4338-b5c3-dd09aff94202	30ede8a8-6429-42cf-97a7-ef1b5657a005	2026-07-10 14:24:16.361277+00	2026-07-10 14:24:16.361277+00
\.


--
-- Data for Name: resource_images; Type: TABLE DATA; Schema: public; Owner: crss_user
--

COPY public.resource_images (resource_id, image_url, is_primary, id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: crss_user
--

COPY public.resources (title, description, condition, status, quantity, quantity_available, pickup_location, tags, barcode, qr_code_url, deposit_amount, max_borrow_days, average_rating, total_borrows, view_count, owner_id, category_id, id, created_at, updated_at) FROM stdin;
cycle	good condition	FAIR	BORROWED	1	0	swami		\N	\N	20.00	1	0.00	0	10	09120b82-0323-4da2-bba8-cc7745635abc	9cdfadf3-bcb9-405a-aa14-4f2f13a1af02	b50df7ac-68e4-4926-ab57-73d5d4aaa12e	2026-07-09 03:42:40.494081+00	2026-07-10 14:24:16.347128+00
Scientific Calculator - Casio fx-991EX	Barely used, perfect for engineering coursework.	GOOD	AVAILABLE	1	1	Library Annex	\N	\N	\N	0.00	14	0.00	0	14	80a92234-c5e5-44ed-9d30-a34d4df04a69	26cbd68c-d4ad-4b22-97b3-314669e4d7b8	e1fa8850-20ba-4b06-94b8-32d87d3dcc5a	2026-07-02 08:30:02.302972+00	2026-07-10 14:38:44.159786+00
Soldering Station Kit	Temperature-controlled soldering iron with stand, solder wire, and flux.	NEW	AVAILABLE	1	1	Robotics Lab, Block D	\N	\N	\N	200.00	3	0.00	0	4	f1d4c251-41bd-4649-8fa8-c154cf64e0f8	c1f5c7bf-dfc6-4d64-84cf-38a7e0a460af	feb2d96c-2a8f-430c-baf0-bec4927e23de	2026-07-02 08:30:02.302972+00	2026-07-02 18:39:06.951662+00
Canon EOS 1500D DSLR Camera	18-55mm kit lens included. Great for club events and photography projects.	GOOD	AVAILABLE	1	1	Hostel Block C, Room 204	\N	\N	\N	500.00	5	0.00	0	10	80a92234-c5e5-44ed-9d30-a34d4df04a69	b89ce10d-a2d6-48b2-84d2-40db28293aa9	4c094d5d-cb12-4a76-b2ac-d430c71bb2d5	2026-07-02 08:30:02.302972+00	2026-07-09 03:41:28.152828+00
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: crss_user
--

COPY public.reviews (resource_id, reviewer_id, rating, comment, id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: crss_user
--

COPY public.users (full_name, email, hashed_password, role, student_id, department, course, year_of_study, bio, skills, profile_picture_url, phone_number, is_verified, is_active, is_suspended, trust_score, sharing_score, id, created_at, updated_at, auth_provider, google_id) FROM stdin;
Admin User	admin@crss.edu	$2b$12$L0tX4/6hjlz0RzF2JsVmC.4pNWORe2l4nhqqhVMJe7sjwcK2xw.cW	ADMIN	\N	Administration	\N	\N	\N	\N	\N	\N	t	t	f	100	0	b934390d-b7fb-4e97-9e0c-b1c2905ec3d1	2026-07-02 08:30:02.302972+00	2026-07-02 08:30:02.302972+00	local	\N
Robotics Club	robotics.club@crss.edu	$2b$12$ZntaJZEqjfTxSfG1ZLSVaORsAhGU4ge9pGyHWNHftUEldiPDLORPa	CLUB	\N	Robotics Club	\N	\N	\N	\N	\N	\N	t	t	t	100	0	f1d4c251-41bd-4649-8fa8-c154cf64e0f8	2026-07-02 08:30:02.302972+00	2026-07-02 11:24:25.484203+00	local	\N
Asha Rao	asha.rao@crss.edu	$2b$12$OLI5PKcBkYDSMSsChc/qf.07PVaZeX1rjqGnZqL4lGYe8xIUSfBRm	STUDENT	CSE2023001	Computer Science	B.Tech CSE	3	\N	\N	\N	\N	t	t	t	100	0	80a92234-c5e5-44ed-9d30-a34d4df04a69	2026-07-02 08:30:02.302972+00	2026-07-02 11:24:31.269929+00	local	\N
Vikash Kumar	vikashonlyfans@gmail.com	$2b$12$mo8Vxp/njNN7VA2CkJnBvOraFlkj1Y2hTLQO8kdGWAZm5XCgzelxG	STUDENT	1234	CSE	BTECH	3	\N	\N	\N	\N	f	t	f	100	0	65d69dde-cfa6-4f5b-9750-a74c6fbd24b7	2026-07-02 17:42:55.105577+00	2026-07-02 17:42:55.105577+00	local	\N
Test Google	testgoogle@college.edu	\N	STUDENT	\N	\N	\N	\N	\N	\N	\N	\N	f	t	f	100	0	640ccb99-6e64-44fd-a24f-8264980c9b5f	2026-07-05 05:33:38.529234+00	2026-07-05 05:33:38.529234+00	local	\N
Test Local	testlocal@college.edu	fake	STUDENT	\N	\N	\N	\N	\N	\N	\N	\N	f	t	f	100	0	5681d60d-142b-455e-9529-3d45255cecb7	2026-07-05 05:33:48.077286+00	2026-07-05 05:33:48.077286+00	local	\N
Test Local 2	testlocal2@college.edu	fake	STUDENT	\N	\N	\N	\N	\N	\N	\N	\N	f	t	f	100	0	27db1823-285a-479a-bd80-d352bd6bf356	2026-07-06 03:53:49.441416+00	2026-07-06 03:53:49.441416+00	local	\N
Akarsh Jain	akarshjain2006@gmail.com	\N	STUDENT	\N	\N	\N	\N	\N	\N	https://lh3.googleusercontent.com/a/ACg8ocLmLivsuCrwCHvjOauqFCL4kJkcJwV6uYlgxa2JAu3QyRsfIQ=s96-c	\N	t	t	f	100	0	09120b82-0323-4da2-bba8-cc7745635abc	2026-07-05 05:38:05.641911+00	2026-07-06 04:07:03.695491+00	local	111990762971003303369
Akarsh Jain	u24cs143@coed.svnit.ac.in	\N	STUDENT	\N	\N	\N	\N	\N	\N	https://lh3.googleusercontent.com/a/ACg8ocKS_rbqQVHqhUkPMjXY7myYUq8BUKz_0UehNb-f3oTkIqKzPw=s96-c	\N	t	t	f	100	0	2a77e5b8-aa8e-4695-a630-aadc68a9a2a2	2026-07-10 14:23:23.177159+00	2026-07-10 14:23:23.177159+00	google	114540731360365016765
\.


--
-- Data for Name: wanted_requests; Type: TABLE DATA; Schema: public; Owner: crss_user
--

COPY public.wanted_requests (user_id, title, description, category_id, is_fulfilled, id, created_at, updated_at) FROM stdin;
09120b82-0323-4da2-bba8-cc7745635abc	calculator		b89ce10d-a2d6-48b2-84d2-40db28293aa9	f	fa94ebfc-34fd-4ae8-bcff-18480f04a3df	2026-07-11 07:02:06.90883+00	2026-07-11 07:02:06.90883+00
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: borrow_requests borrow_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.borrow_requests
    ADD CONSTRAINT borrow_requests_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: complaints complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: resource_images resource_images_pkey; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.resource_images
    ADD CONSTRAINT resource_images_pkey PRIMARY KEY (id);


--
-- Name: resources resources_barcode_key; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_barcode_key UNIQUE (barcode);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_student_id_key; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_student_id_key UNIQUE (student_id);


--
-- Name: wanted_requests wanted_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.wanted_requests
    ADD CONSTRAINT wanted_requests_pkey PRIMARY KEY (id);


--
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);


--
-- Name: ix_borrow_requests_id; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_borrow_requests_id ON public.borrow_requests USING btree (id);


--
-- Name: ix_borrow_requests_status; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_borrow_requests_status ON public.borrow_requests USING btree (status);


--
-- Name: ix_categories_id; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_categories_id ON public.categories USING btree (id);


--
-- Name: ix_categories_slug; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE UNIQUE INDEX ix_categories_slug ON public.categories USING btree (slug);


--
-- Name: ix_complaints_id; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_complaints_id ON public.complaints USING btree (id);


--
-- Name: ix_notifications_id; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_notifications_id ON public.notifications USING btree (id);


--
-- Name: ix_resource_images_id; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_resource_images_id ON public.resource_images USING btree (id);


--
-- Name: ix_resources_id; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_resources_id ON public.resources USING btree (id);


--
-- Name: ix_resources_status; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_resources_status ON public.resources USING btree (status);


--
-- Name: ix_resources_title; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_resources_title ON public.resources USING btree (title);


--
-- Name: ix_reviews_id; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_reviews_id ON public.reviews USING btree (id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_google_id; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE UNIQUE INDEX ix_users_google_id ON public.users USING btree (google_id);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_wanted_requests_id; Type: INDEX; Schema: public; Owner: crss_user
--

CREATE INDEX ix_wanted_requests_id ON public.wanted_requests USING btree (id);


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: borrow_requests borrow_requests_borrower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.borrow_requests
    ADD CONSTRAINT borrow_requests_borrower_id_fkey FOREIGN KEY (borrower_id) REFERENCES public.users(id);


--
-- Name: borrow_requests borrow_requests_lender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.borrow_requests
    ADD CONSTRAINT borrow_requests_lender_id_fkey FOREIGN KEY (lender_id) REFERENCES public.users(id);


--
-- Name: borrow_requests borrow_requests_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.borrow_requests
    ADD CONSTRAINT borrow_requests_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: complaints complaints_against_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_against_user_id_fkey FOREIGN KEY (against_user_id) REFERENCES public.users(id);


--
-- Name: complaints complaints_borrow_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_borrow_request_id_fkey FOREIGN KEY (borrow_request_id) REFERENCES public.borrow_requests(id);


--
-- Name: complaints complaints_filed_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_filed_by_id_fkey FOREIGN KEY (filed_by_id) REFERENCES public.users(id);


--
-- Name: complaints complaints_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: resource_images resource_images_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.resource_images
    ADD CONSTRAINT resource_images_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: resources resources_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: resources resources_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: wanted_requests wanted_requests_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.wanted_requests
    ADD CONSTRAINT wanted_requests_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: wanted_requests wanted_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crss_user
--

ALTER TABLE ONLY public.wanted_requests
    ADD CONSTRAINT wanted_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ZGlW1XkZZ6ghBN0V9MgqUGGmp4LrbJATsuipHfdLXODHCIBgNI7tsiHVaZqp1bT

