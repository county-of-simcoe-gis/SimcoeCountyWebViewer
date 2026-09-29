-- Table: public.tbl_211_categories

-- DROP TABLE IF EXISTS public.tbl_211_categories;

CREATE TABLE IF NOT EXISTS public.tbl_211_categories
(
    gh_id text COLLATE pg_catalog."default",
    general_heading text COLLATE pg_catalog."default",
    group_id text COLLATE pg_catalog."default",
    group_name text COLLATE pg_catalog."default",
    icon_name_full text COLLATE pg_catalog."default",
    icon_name_full_group text COLLATE pg_catalog."default",
    is_french boolean
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_211_categories
    OWNER to postgres;