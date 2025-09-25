-- Table: public.tbl_mymaps

-- DROP TABLE IF EXISTS public.tbl_mymaps;

CREATE TABLE IF NOT EXISTS public.tbl_mymaps
(
    id uuid NOT NULL DEFAULT uuid_generate_v1(),
    json text COLLATE pg_catalog."default",
    date_created date,
    CONSTRAINT tbl_mymaps_pk PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_mymaps
    OWNER to postgres;