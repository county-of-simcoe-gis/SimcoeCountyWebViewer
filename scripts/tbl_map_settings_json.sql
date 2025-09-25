-- Table: public.tbl_map_settings_json

-- DROP TABLE IF EXISTS public.tbl_map_settings_json;

CREATE TABLE IF NOT EXISTS public.tbl_map_settings_json
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    parent_id uuid NOT NULL,
    version integer NOT NULL DEFAULT 1,
    active boolean NOT NULL DEFAULT false,
    created_date timestamp with time zone DEFAULT now(),
    created_by character varying(250) COLLATE pg_catalog."default",
    json text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT tbl_map_settings_json_pkey PRIMARY KEY (id),
    CONSTRAINT tbl_map_settings_fk FOREIGN KEY (parent_id)
        REFERENCES public.tbl_map_settings (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_map_settings_json
    OWNER to postgres;
-- Index: fki_tbl_map_settings_fk

-- DROP INDEX IF EXISTS public.fki_tbl_map_settings_fk;

CREATE INDEX IF NOT EXISTS fki_tbl_map_settings_fk
    ON public.tbl_map_settings_json USING btree
    (parent_id ASC NULLS LAST)
    TABLESPACE pg_default;