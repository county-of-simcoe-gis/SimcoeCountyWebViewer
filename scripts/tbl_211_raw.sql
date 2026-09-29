-- Table: public.tbl_211_raw

-- DROP TABLE IF EXISTS public.tbl_211_raw;

CREATE TABLE IF NOT EXISTS public.tbl_211_raw
(
    "record_#" text COLLATE pg_catalog."default",
    organization_program_name text COLLATE pg_catalog."default",
    located_in_community text COLLATE pg_catalog."default",
    age_category text COLLATE pg_catalog."default",
    address text COLLATE pg_catalog."default",
    areas_served text COLLATE pg_catalog."default",
    cwd_simcategory_headinggroups text COLLATE pg_catalog."default",
    cwd_simcategory_headings text COLLATE pg_catalog."default",
    date_updated text COLLATE pg_catalog."default",
    dates text COLLATE pg_catalog."default",
    description_brief text COLLATE pg_catalog."default",
    description_service text COLLATE pg_catalog."default",
    eligibility text COLLATE pg_catalog."default",
    email text COLLATE pg_catalog."default",
    geocoding_info text COLLATE pg_catalog."default",
    hours text COLLATE pg_catalog."default",
    languages text COLLATE pg_catalog."default",
    latitude text COLLATE pg_catalog."default",
    longitude text COLLATE pg_catalog."default",
    map_record text COLLATE pg_catalog."default",
    office_phone text COLLATE pg_catalog."default",
    parent_agency_name text COLLATE pg_catalog."default",
    "parent_agency_record_#" text COLLATE pg_catalog."default",
    physical_access text COLLATE pg_catalog."default",
    public_comments text COLLATE pg_catalog."default",
    taxonomy text COLLATE pg_catalog."default",
    taxonomy_codes text COLLATE pg_catalog."default",
    toll_free_phone text COLLATE pg_catalog."default",
    tty_phone text COLLATE pg_catalog."default",
    website text COLLATE pg_catalog."default"
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_211_raw
    OWNER to postgres;