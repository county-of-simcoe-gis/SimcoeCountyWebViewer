-- Table: public.tbl_user_storage

-- DROP TABLE IF EXISTS public.tbl_user_storage;

CREATE TABLE IF NOT EXISTS public.tbl_user_storage
(
    oid character varying(40) COLLATE pg_catalog."default" NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_access timestamp with time zone,
    last_edit timestamp with time zone,
    email character varying(500) COLLATE pg_catalog."default",
    storage_data bytea,
    CONSTRAINT tbl_user_storage_pkey PRIMARY KEY (oid)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_user_storage
    OWNER to postgres;