--
-- PostgreSQL database dump
--

-- Dumped from database version 17.0 (Debian 17.0-1.pgdg110+1)
-- Dumped by pg_dump version 17.0 (Debian 17.0-1.pgdg110+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: scout; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA scout;


ALTER SCHEMA scout OWNER TO postgres;

--
-- Name: tiger; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA tiger;


ALTER SCHEMA tiger OWNER TO postgres;

--
-- Name: tiger_data; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA tiger_data;


ALTER SCHEMA tiger_data OWNER TO postgres;

--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA topology;


ALTER SCHEMA topology OWNER TO postgres;

--
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- Name: fuzzystrmatch; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA public;


--
-- Name: EXTENSION fuzzystrmatch; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION fuzzystrmatch IS 'determine similarities and distance between strings';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: postgis_tiger_geocoder; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder WITH SCHEMA tiger;


--
-- Name: EXTENSION postgis_tiger_geocoder; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_tiger_geocoder IS 'PostGIS tiger geocoder and reverse geocoder';


--
-- Name: postgis_topology; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA topology;


--
-- Name: EXTENSION postgis_topology; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_topology IS 'PostGIS topology spatial types and functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: place_category_enum; Type: TYPE; Schema: scout; Owner: postgres
--

CREATE TYPE scout.place_category_enum AS ENUM (
    'museum',
    'tourist_attraction',
    'park',
    'shopping_mall',
    'store',
    'point_of_interest',
    'church',
    'place_of_worship',
    'natural_feature',
    'art_gallery',
    'amusement_park',
    'hiking_area',
    'route',
    'plaza',
    'scenic_spot',
    'monument'
);


ALTER TYPE scout.place_category_enum OWNER TO postgres;

--
-- Name: price_level_enum; Type: TYPE; Schema: scout; Owner: postgres
--

CREATE TYPE scout.price_level_enum AS ENUM (
    'free',
    'inexpensive',
    'moderate',
    'expensive',
    'very_expensive'
);


ALTER TYPE scout.price_level_enum OWNER TO postgres;

--
-- Name: route_mode_enum; Type: TYPE; Schema: scout; Owner: postgres
--

CREATE TYPE scout.route_mode_enum AS ENUM (
    'walking',
    'driving'
);


ALTER TYPE scout.route_mode_enum OWNER TO postgres;

--
-- Name: route_theme_enum; Type: TYPE; Schema: scout; Owner: postgres
--

CREATE TYPE scout.route_theme_enum AS ENUM (
    'history',
    'nature',
    'viewpoints',
    'shopping',
    'evening',
    'highlights'
);


ALTER TYPE scout.route_theme_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: scout; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scout (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.scout OWNER TO postgres;

--
-- Name: scout_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scout_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scout_id_seq OWNER TO postgres;

--
-- Name: scout_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scout_id_seq OWNED BY public.scout.id;


--
-- Name: cities; Type: TABLE; Schema: scout; Owner: postgres
--

CREATE TABLE scout.cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    boundary public.geometry(Polygon,4326) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE scout.cities OWNER TO postgres;

--
-- Name: places; Type: TABLE; Schema: scout; Owner: postgres
--

CREATE TABLE scout.places (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_id uuid NOT NULL,
    name character varying(512) NOT NULL,
    geom public.geometry(Geometry,4326) NOT NULL,
    google_place_id character varying(255) NOT NULL,
    category scout.place_category_enum NOT NULL,
    tags jsonb DEFAULT '{}'::jsonb NOT NULL,
    rating numeric(3,1),
    review_count integer,
    visit_duration_minutes integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    price_level scout.price_level_enum
);


ALTER TABLE scout.places OWNER TO postgres;

--
-- Name: route_stops; Type: TABLE; Schema: scout; Owner: postgres
--

CREATE TABLE scout.route_stops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    route_id uuid NOT NULL,
    place_id uuid NOT NULL,
    order_index integer NOT NULL,
    visit_duration_minutes integer
);


ALTER TABLE scout.route_stops OWNER TO postgres;

--
-- Name: routes; Type: TABLE; Schema: scout; Owner: postgres
--

CREATE TABLE scout.routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    theme scout.route_theme_enum NOT NULL,
    route_mode scout.route_mode_enum DEFAULT 'walking'::scout.route_mode_enum NOT NULL,
    duration_minutes integer NOT NULL,
    distance_km numeric(6,2) NOT NULL,
    start_place_id uuid,
    route_geometry public.geometry(LineString,4326) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    price_level scout.price_level_enum NOT NULL
);


ALTER TABLE scout.routes OWNER TO postgres;

--
-- Name: scout id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scout ALTER COLUMN id SET DEFAULT nextval('public.scout_id_seq'::regclass);


--
-- Data for Name: scout; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scout (id, "timestamp", name) FROM stdin;
2	1773218681204	CreatePostgisExtension1773218681204
3	1773218686204	CreateCitiesTable1773218686204
4	1773218691204	CreatePlacesTable1773218691204
5	1773218696204	CreateRoutesTable1773218696204
6	1773218701204	CreateRouteStopsTable1773218701204
9	1773218676204	CreateSchema1773218676204
13	1773237784000	PriceLevelToDollarSigns1773237784000
14	1773237935000	PriceLevelToFiveLevels1773237935000
15	1773237935000	PriceLevelToFiveLevels1773237935000
16	1773237935000	PriceLevelToFiveLevels1773237935000
17	1773239256962	AddPlaceCategoryStreetSquareViewpointMonument1773239256962
18	1773239256962	AddPlaceCategoryStreetSquareViewpointMonument1773239256962
19	1773239256962	AddPlaceCategoryStreetSquareViewpointMonument1773239256962
20	1773240113598	RequireRouteDistancePriceGeometry1773240113598
\.


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- Data for Name: cities; Type: TABLE DATA; Schema: scout; Owner: postgres
--

COPY scout.cities (id, name, boundary, created_at) FROM stdin;
2c1ef0f1-5886-4def-aef3-0d3acab0c510	Marbella, Spain	0103000020E61000000100000005000000D70547B7E8FD13C0F3D0E98F103C4240D70547B7E8FD13C055E5A9332744424020FEFD4598ED12C055E5A9332744424020FEFD4598ED12C0F3D0E98F103C4240D70547B7E8FD13C0F3D0E98F103C4240	2026-03-11 15:58:04.511655+00
\.


--
-- Data for Name: places; Type: TABLE DATA; Schema: scout; Owner: postgres
--

COPY scout.places (id, city_id, name, geom, google_place_id, category, tags, rating, review_count, visit_duration_minutes, created_at, updated_at, price_level) FROM stdin;
04f2a94f-7231-4e1c-8a82-fe417f373941	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Padel and Tennis Club Nueva Alcantara	0101000020E610000049055FE2D9EF13C0D222916C643D4240	ChIJmYV3dyQqcw0RPaD6GcE-oRs	store	{"types": "gym,sports_school,sports_complex,sports_club,association_or_organization,sports_activity_location,health,restaurant,food,point_of_interest,establishment"}	4.3	317	30	2026-03-11 15:58:06.646382+00	2026-03-11 15:58:06.646382+00	\N
7b328d2a-19b6-4106-8b79-1865e86f2d52	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Recinto Ferial de San Pedro Alcántara (Marbella)	0101000020E6100000E82E89B322F213C0A31F0DA7CC3C4240	ChIJpcq2wzwqcw0R4kDsd-_u7Z0	tourist_attraction	{"types": "event_venue,point_of_interest,establishment"}	4.5	386	10	2026-03-11 15:58:06.739552+00	2026-03-11 15:58:06.739552+00	\N
bbb2da61-8855-4f99-aaa4-4888ebd22df0	2c1ef0f1-5886-4def-aef3-0d3acab0c510	McDonald's	0101000020E61000000AF4893C49FA13C04C378941603D4240	ChIJZb4jugYqcw0RnkFero07bZ8	store	{"types": "fast_food_restaurant,restaurant,food,point_of_interest,establishment"}	3.3	2180	30	2026-03-11 15:58:06.747095+00	2026-03-11 15:58:06.747095+00	\N
768bdb82-8bf7-442d-99f5-c777ae2d92bb	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Barbillón Marbella	0101000020E6100000AE71474959F813C0D27CDF09073C4240	ChIJUXXxq3Arcw0REOAnRV29mQg	store	{"types": "restaurant,food,point_of_interest,establishment"}	4.2	721	30	2026-03-11 15:58:06.75533+00	2026-03-11 15:58:06.75533+00	\N
8d8d8b92-ba6c-4f44-b2a4-1f2d80c1c3ae	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Tragabuches Marbella Dani García	0101000020E6100000EBF36272B4E413C05F6864462E3E4240	ChIJ9dqXD5Mpcw0RqeQFhbeIx0Q	store	{"types": "tapas_restaurant,spanish_restaurant,restaurant,food,point_of_interest,establishment"}	4.3	1233	30	2026-03-11 15:58:06.760502+00	2026-03-11 15:58:06.760502+00	\N
2914ba6a-8922-4bcf-890b-00b052ffd7bc	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Alfredo Bar Restaurante	0101000020E6100000A3E2A4D535F713C0904946CEC23D4240	ChIJB3BNkz0qcw0RW4ziv75Bj2Q	store	{"types": "bar_and_grill,mediterranean_restaurant,spanish_restaurant,bar,restaurant,food,point_of_interest,establishment"}	4.5	3121	30	2026-03-11 15:58:06.766299+00	2026-03-11 15:58:06.766299+00	\N
8c895aad-6bec-47a7-8e30-f1c50cf98d93	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Alabardero Beach Club Marbella	0101000020E610000036F1C4628AE813C0F88D5484403D4240	ChIJARx2rCAqcw0RQT9Kvs_uXr0	store	{"types": "restaurant,mediterranean_restaurant,cocktail_bar,spanish_restaurant,seafood_restaurant,korean_restaurant,service,event_venue,bar,food,point_of_interest,establishment"}	4.1	2989	30	2026-03-11 15:58:06.771342+00	2026-03-11 15:58:06.771342+00	\N
c9f0ef29-bc77-4611-abb7-33e576e08812	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Marisquería El Ancla	0101000020E610000097DF6932E3F513C05492D0F12C3C4240	ChIJgwVAszAqcw0R0TkPQ62h-Lo	store	{"types": "seafood_restaurant,mediterranean_restaurant,spanish_restaurant,restaurant,food,point_of_interest,establishment"}	4.3	1799	30	2026-03-11 15:58:06.777087+00	2026-03-11 15:58:06.777087+00	\N
ec2b9dc5-e657-4e43-a8b3-4db6a2a9df31	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Bulevar San Pedro Alcántara (WEB)	0103000020E610000001000000050000000218D3E283F613C052606E60763D42400218D3E283F613C0779C90C8CE3D4240D436C1A1C0F313C0779C90C8CE3D4240D436C1A1C0F313C052606E60763D42400218D3E283F613C052606E60763D4240	ChIJk6y_sj0qcw0R1wTH3JO56wU	tourist_attraction	{"types": "tourist_attraction,playground,park,point_of_interest,establishment"}	4.5	749	10	2026-03-11 15:58:06.78173+00	2026-03-11 15:58:06.78173+00	\N
3ce6736a-e78a-4767-b3c0-8034f154fd93	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Restaurante Marabierta	0101000020E6100000E0980A968FE913C0492A53CC413D4240	ChIJ3bVop9srcw0Rv6b4leCyrbg	store	{"types": "restaurant,mediterranean_restaurant,spanish_restaurant,food,point_of_interest,establishment"}	4.4	2235	30	2026-03-11 15:58:06.788671+00	2026-03-11 15:58:06.788671+00	\N
a406fd64-0e0b-4dd9-9fcc-eb0609105154	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Chiringuito Guayaba Beach	0101000020E6100000246A58422DF413C0F6AD7BD0583C4240	ChIJ71zBCMApcw0ROAxwhFIN5Xw	store	{"types": "restaurant,food,point_of_interest,establishment"}	4.4	1518	30	2026-03-11 15:58:06.794739+00	2026-03-11 15:58:06.794739+00	\N
cfd28c03-7994-4126-a4b6-2d41075dd043	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Kala Kalua Playa Chiringuito	0101000020E610000089E87C1DDDE513C0551A8C6C423D4240	ChIJiQymg4kpcw0RNcBe0yjtunA	store	{"types": "mediterranean_restaurant,bar,restaurant,food,point_of_interest,establishment"}	4.3	1828	30	2026-03-11 15:58:06.800556+00	2026-03-11 15:58:06.800556+00	\N
df7e2a6c-5e5a-4ad1-b300-7245d7b5453a	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Restaurante Asador Guadalmina	0101000020E61000004B4BF619610314C0DC10E335AF3C4240	ChIJicH0oWgqcw0Re80duvHNKPE	store	{"types": "spanish_restaurant,restaurant,food,point_of_interest,establishment"}	3.7	2800	30	2026-03-11 15:58:06.805374+00	2026-03-11 15:58:06.805374+00	\N
52d2d9c6-6538-46c1-9586-cde6bb426b52	2c1ef0f1-5886-4def-aef3-0d3acab0c510	ÁMMO - Beach Club & Cocktail Bar Marbella	0101000020E61000008600E0D8B3E713C0D269824D423D4240	ChIJgwwvsgErcw0RwvVWg1C43S4	store	{"types": "restaurant,mediterranean_restaurant,cocktail_bar,spanish_restaurant,swimming_pool,seafood_restaurant,korean_restaurant,sports_activity_location,live_music_venue,event_venue,bar,food,point_of_interest,establishment"}	4.5	582	30	2026-03-11 15:58:06.812445+00	2026-03-11 15:58:06.812445+00	\N
ac0d94b9-03b5-4990-afb1-303b0a32f41d	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Nuevo Reino	0101000020E6100000D66AB4C12EE713C0D001EE1E453D4240	ChIJkRES9Ikpcw0R9jiytOWUA_U	store	{"types": "restaurant,mediterranean_restaurant,spanish_restaurant,food,point_of_interest,establishment"}	4.2	1544	30	2026-03-11 15:58:06.818804+00	2026-03-11 15:58:06.818804+00	\N
c805efbf-9a27-4b32-ade4-452557a4a965	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Da Bruno San Pedro	0101000020E6100000749F77BEFAF313C089AAA976973D4240	ChIJi4YXID0qcw0RJ1Z0dFxUKSY	store	{"types": "italian_restaurant,pizza_restaurant,mediterranean_restaurant,restaurant,food,point_of_interest,establishment"}	4.3	1413	30	2026-03-11 15:58:06.823805+00	2026-03-11 15:58:06.823805+00	\N
010fbd8a-3f80-4cec-af8b-5e3d90ea221a	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Playa Nini Beach Restaurant	0101000020E61000003028D36872F113C0FFACF9F1973C4240	ChIJnzUOTOgrcw0RclwYHW1oGEY	store	{"types": "restaurant,food,point_of_interest,establishment"}	4.0	889	30	2026-03-11 15:58:06.828802+00	2026-03-11 15:58:06.828802+00	\N
4556ee2c-c8d9-4ae6-aa5b-e1be10567fd8	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Luini	0101000020E61000001B00602B57F613C0B997EAB8D03D4240	ChIJ2zVDlEUrcw0RsdUVQPODOfQ	store	{"types": "italian_restaurant,restaurant,food,point_of_interest,establishment"}	4.8	1395	30	2026-03-11 15:58:06.836029+00	2026-03-11 15:58:06.836029+00	\N
1e4eebd9-bc62-4598-bbd2-c8e19c4f4b2b	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Dajidali	0101000020E61000009D8E119A6E0314C024AF7378AD3C4240	ChIJD3Wv40Ercw0RJ4qDo2ZDwac	store	{"types": "japanese_restaurant,restaurant,food,point_of_interest,establishment"}	4.6	359	30	2026-03-11 15:58:06.843513+00	2026-03-11 15:58:06.843513+00	\N
8fa14ef7-30c8-41b0-b566-eb78ba2ee099	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Hustle n' Flow Eatery · San Pedro	0101000020E6100000C25E72ED55F513C0BE688F17D23D4240	ChIJfyBxdz0qcw0RR4DO56jIl_Q	store	{"types": "brunch_restaurant,cafe,vegan_restaurant,vegetarian_restaurant,meal_takeaway,food_store,store,restaurant,food,point_of_interest,establishment"}	4.5	643	30	2026-03-11 15:58:06.848805+00	2026-03-11 15:58:06.848805+00	\N
18a3f196-3a8f-4dc7-8d2d-21ab7408dba1	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Église de San Pedro de Alcántara	0101000020E610000086A4BB90B3F513C0BFB91A344F3E4240	ChIJs6oF_BYqcw0Rf7IhuKqN_54	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	4.6	367	20	2026-03-11 15:58:06.853377+00	2026-03-11 15:58:06.853377+00	\N
75f7d5cd-efe3-4b6a-b001-14f7e71467b3	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Centro Comercial La Colonia	0101000020E610000021F07673A7FA13C06B0080AD5C3D4240	ChIJtT08j3grcw0RsFsh88n5080	shopping_mall	{"types": "shopping_mall,point_of_interest,establishment"}	4.1	180	30	2026-03-11 15:58:06.860513+00	2026-03-11 15:58:06.860513+00	\N
5d57febb-ff0b-4455-b59d-5f16b35f0718	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Parroquia Virgen del Rocío	0101000020E6100000E7864B3382FA13C05D09EE51C93D4240	ChIJv8y3aBUqcw0Rfsn1OCv6IG8	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	4.5	140	20	2026-03-11 15:58:06.867705+00	2026-03-11 15:58:06.867705+00	\N
d5c3d1f4-541e-415c-a5de-a63628aa49d1	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Вознесенский приход Русской Православной Церкви в Марбелье	0101000020E61000000C530031AEF513C0D4C045DDBD3D4240	ChIJf0oVoT0qcw0RHzMPNuqkXDs	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	4.8	60	20	2026-03-11 15:58:06.873099+00	2026-03-11 15:58:06.873099+00	\N
085214a5-db29-4a07-8953-3b0c4fcb8336	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Basílica Paleocristiana de Vega del Mar	0101000020E6100000939DC8DD31F613C048E06AF8713C4240	ChIJqSB-mTAqcw0Rkqdmv4yeBUs	tourist_attraction	{"types": "historical_landmark,historical_place,church,place_of_worship,association_or_organization,point_of_interest,establishment"}	4.4	116	10	2026-03-11 15:58:06.878019+00	2026-03-11 15:58:06.878019+00	\N
51051d06-c386-4535-a9fb-847595335826	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Centro Comercial La Colonia	0101000020E61000002516421889FA13C01F6FF25B743D4240	ChIJfTAbHj8qcw0R-lWhdNfdCOo	shopping_mall	{"types": "shopping_mall,point_of_interest,establishment"}	4.0	1070	30	2026-03-11 15:58:06.882996+00	2026-03-11 15:58:06.882996+00	\N
7bf51d7b-8894-46c2-8461-21e496c3b170	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Iglesia Evangélica Vive San Pedro	0101000020E610000019219793ABF313C06468869EDE3D4240	ChIJfWsFXT0qcw0R3zyRlOhB6i0	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	5.0	27	20	2026-03-11 15:58:06.887511+00	2026-03-11 15:58:06.887511+00	\N
8d238b21-324d-4d94-9cd6-c252969e5187	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Cáritas Diocesanas	0101000020E6100000ECB314DA83FA13C02CCC8CC8C13D4240	ChIJv8y3aBUqcw0R4z0aDYUY_Qk	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	4.2	5	20	2026-03-11 15:58:06.89336+00	2026-03-11 15:58:06.89336+00	\N
1b18de52-6c2e-43ab-a462-279b9614d02d	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Iglesia Cristiana Evangelista De San Pedro De Alcántara	0101000020E61000009FCC9AB399F613C06846F58C333E4240	ChIJiV26XRYqcw0RXIdb95Itc5Y	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	4.8	20	20	2026-03-11 15:58:06.898363+00	2026-03-11 15:58:06.898363+00	\N
fdf21d12-0ebe-4d8a-b277-0634d68a8820	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Puerto Banus Christian Church (The Wave, San Pedro)	0101000020E6100000958CADB195F113C022CA726D033E4240	ChIJpS_1qJMrcw0R0nFejA2Qgfg	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	3.3	7	20	2026-03-11 15:58:06.904051+00	2026-03-11 15:58:06.904051+00	\N
826c136b-daac-4514-8a4b-e0082be3e8c8	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Plazapark 36 / local celebraciones / alquiler local / San pedro alcantara	0103000020E61000000100000005000000CD3FA3AFBCF813C096147B87953D4240CD3FA3AFBCF813C0BB509DEFED3D42409F5E916EF9F513C0BB509DEFED3D42409F5E916EF9F513C096147B87953D4240CD3FA3AFBCF813C096147B87953D4240	ChIJIf9RnT0rcw0RfxHQJxKcOnI	park	{"types": "city_park,cafeteria,shopping_mall,playground,park,restaurant,point_of_interest,food,establishment"}	\N	\N	30	2026-03-11 15:58:06.912206+00	2026-03-11 15:58:06.912206+00	\N
731d5f3f-f165-4e41-ba59-b9a505896280	2c1ef0f1-5886-4def-aef3-0d3acab0c510	The Anglican Church	0101000020E6100000ECB314DA83FA13C02CCC8CC8C13D4240	ChIJ__9vND4qcw0RULcQp8_ff7A	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	\N	\N	20	2026-03-11 15:58:06.920276+00	2026-03-11 15:58:06.920276+00	\N
03926f88-6154-4d1e-859f-df47ebd0b856	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Iglesia Cristiana Buenas Nuevas en San Pedro Alcantára	0101000020E6100000D3F31373B5FA13C0CB0D2B81393D4240	ChIJl7w11T4qcw0RVbE3MGGf1QU	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	4.9	8	20	2026-03-11 15:58:06.926949+00	2026-03-11 15:58:06.926949+00	\N
8052ba98-daa2-4791-b1b4-05cdd5639cc4	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Great Awakening church	0101000020E610000025F4E967A0F813C086F7C19E1B3E4240	ChIJXYmU3BUqcw0RZ-N--qgKbJY	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	\N	\N	20	2026-03-11 15:58:06.93317+00	2026-03-11 15:58:06.93317+00	\N
60a43870-1a24-4d48-a755-ecbd12a3dbcf	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Iglesia Evangelica Cristo el Camino a la Salvación (CTWS)	0101000020E6100000ED20C033EBF613C07B698A00A73D4240	ChIJ0crKLwArcw0RIjbUh240mM4	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	5.0	1	20	2026-03-11 15:58:06.938992+00	2026-03-11 15:58:06.938992+00	\N
adc06635-e3cb-426b-afa6-5722ee5436aa	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Capilla Virgen del Carmen	0101000020E61000009372F7393EFA13C087C32D7A023D4240	ChIJLe7FtGYrcw0RAKLYKbcwJiY	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	5.0	2	20	2026-03-11 15:58:06.944718+00	2026-03-11 15:58:06.944718+00	\N
dffc0679-3f5e-48b4-8bb2-942478a68518	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Jesus Christ Saves Global Outreach San Pedro Family	0101000020E610000047A98427F4F213C0B75F3E59313E4240	ChIJ99p4hhcqcw0RcYNejyQ-ta4	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	\N	\N	20	2026-03-11 15:58:06.949021+00	2026-03-11 15:58:06.949021+00	\N
48dee317-547d-4dc0-8ecf-df2a69d07b12	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Ministério Apostólico Profetico Internacional	0101000020E6100000D28E7637AAF613C070F893E7B03E4240	ChIJl_37p4Urcw0RLvnozfDNlLk	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	\N	\N	20	2026-03-11 15:58:06.953453+00	2026-03-11 15:58:06.953453+00	\N
27ac8a03-6bc1-47dd-b7f4-39b9cca57661	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Faith Baptist Church	0101000020E61000004192FE0351F413C0CD65B49FD63E4240	ChIJ-6hs7BAqcw0R9Pi7a1-OEtQ	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	\N	\N	20	2026-03-11 15:58:06.957968+00	2026-03-11 15:58:06.957968+00	\N
be78bcfc-a6ec-4462-a2a9-78a581b06456	2c1ef0f1-5886-4def-aef3-0d3acab0c510	Iglesia Evangélica Shalom	0101000020E6100000C3A68416C8F213C08FDFDBF4673E4240	ChIJCYULPwArcw0R8tm-banRoQc	church	{"types": "church,place_of_worship,association_or_organization,point_of_interest,establishment"}	\N	\N	20	2026-03-11 15:58:06.963277+00	2026-03-11 15:58:06.963277+00	\N
\.


--
-- Data for Name: route_stops; Type: TABLE DATA; Schema: scout; Owner: postgres
--

COPY scout.route_stops (id, route_id, place_id, order_index, visit_duration_minutes) FROM stdin;
\.


--
-- Data for Name: routes; Type: TABLE DATA; Schema: scout; Owner: postgres
--

COPY scout.routes (id, city_id, name, theme, route_mode, duration_minutes, distance_km, start_place_id, route_geometry, created_at, price_level) FROM stdin;
\.


--
-- Data for Name: geocode_settings; Type: TABLE DATA; Schema: tiger; Owner: postgres
--

COPY tiger.geocode_settings (name, setting, unit, category, short_desc) FROM stdin;
\.


--
-- Data for Name: pagc_gaz; Type: TABLE DATA; Schema: tiger; Owner: postgres
--

COPY tiger.pagc_gaz (id, seq, word, stdword, token, is_custom) FROM stdin;
\.


--
-- Data for Name: pagc_lex; Type: TABLE DATA; Schema: tiger; Owner: postgres
--

COPY tiger.pagc_lex (id, seq, word, stdword, token, is_custom) FROM stdin;
\.


--
-- Data for Name: pagc_rules; Type: TABLE DATA; Schema: tiger; Owner: postgres
--

COPY tiger.pagc_rules (id, rule, is_custom) FROM stdin;
\.


--
-- Data for Name: topology; Type: TABLE DATA; Schema: topology; Owner: postgres
--

COPY topology.topology (id, name, srid, "precision", hasz) FROM stdin;
\.


--
-- Data for Name: layer; Type: TABLE DATA; Schema: topology; Owner: postgres
--

COPY topology.layer (topology_id, layer_id, schema_name, table_name, feature_column, feature_type, level, child_id) FROM stdin;
\.


--
-- Name: scout_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.scout_id_seq', 20, true);


--
-- Name: topology_id_seq; Type: SEQUENCE SET; Schema: topology; Owner: postgres
--

SELECT pg_catalog.setval('topology.topology_id_seq', 1, false);


--
-- Name: scout PK_d418f78c4a4038189dc337534c3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scout
    ADD CONSTRAINT "PK_d418f78c4a4038189dc337534c3" PRIMARY KEY (id);


--
-- Name: cities pk_cities; Type: CONSTRAINT; Schema: scout; Owner: postgres
--

ALTER TABLE ONLY scout.cities
    ADD CONSTRAINT pk_cities PRIMARY KEY (id);


--
-- Name: places pk_places; Type: CONSTRAINT; Schema: scout; Owner: postgres
--

ALTER TABLE ONLY scout.places
    ADD CONSTRAINT pk_places PRIMARY KEY (id);


--
-- Name: route_stops pk_route_stops; Type: CONSTRAINT; Schema: scout; Owner: postgres
--

ALTER TABLE ONLY scout.route_stops
    ADD CONSTRAINT pk_route_stops PRIMARY KEY (id);


--
-- Name: routes pk_routes; Type: CONSTRAINT; Schema: scout; Owner: postgres
--

ALTER TABLE ONLY scout.routes
    ADD CONSTRAINT pk_routes PRIMARY KEY (id);


--
-- Name: places uq_places_google_place_id; Type: CONSTRAINT; Schema: scout; Owner: postgres
--

ALTER TABLE ONLY scout.places
    ADD CONSTRAINT uq_places_google_place_id UNIQUE (google_place_id);


--
-- Name: cities_boundary_idx; Type: INDEX; Schema: scout; Owner: postgres
--

CREATE INDEX cities_boundary_idx ON scout.cities USING gist (boundary);


--
-- Name: places_city_id_idx; Type: INDEX; Schema: scout; Owner: postgres
--

CREATE INDEX places_city_id_idx ON scout.places USING btree (city_id);


--
-- Name: places_geom_idx; Type: INDEX; Schema: scout; Owner: postgres
--

CREATE INDEX places_geom_idx ON scout.places USING gist (geom);


--
-- Name: route_stops_route_id_idx; Type: INDEX; Schema: scout; Owner: postgres
--

CREATE INDEX route_stops_route_id_idx ON scout.route_stops USING btree (route_id);


--
-- Name: routes_city_id_idx; Type: INDEX; Schema: scout; Owner: postgres
--

CREATE INDEX routes_city_id_idx ON scout.routes USING btree (city_id);


--
-- Name: places fk_places_city; Type: FK CONSTRAINT; Schema: scout; Owner: postgres
--

ALTER TABLE ONLY scout.places
    ADD CONSTRAINT fk_places_city FOREIGN KEY (city_id) REFERENCES scout.cities(id) ON DELETE CASCADE;


--
-- Name: route_stops fk_route_stops_place; Type: FK CONSTRAINT; Schema: scout; Owner: postgres
--

ALTER TABLE ONLY scout.route_stops
    ADD CONSTRAINT fk_route_stops_place FOREIGN KEY (place_id) REFERENCES scout.places(id) ON DELETE CASCADE;


--
-- Name: route_stops fk_route_stops_route; Type: FK CONSTRAINT; Schema: scout; Owner: postgres
--

ALTER TABLE ONLY scout.route_stops
    ADD CONSTRAINT fk_route_stops_route FOREIGN KEY (route_id) REFERENCES scout.routes(id) ON DELETE CASCADE;


--
-- Name: routes fk_routes_city; Type: FK CONSTRAINT; Schema: scout; Owner: postgres
--

ALTER TABLE ONLY scout.routes
    ADD CONSTRAINT fk_routes_city FOREIGN KEY (city_id) REFERENCES scout.cities(id) ON DELETE CASCADE;


--
-- Name: routes fk_routes_start_place; Type: FK CONSTRAINT; Schema: scout; Owner: postgres
--

ALTER TABLE ONLY scout.routes
    ADD CONSTRAINT fk_routes_start_place FOREIGN KEY (start_place_id) REFERENCES scout.places(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

