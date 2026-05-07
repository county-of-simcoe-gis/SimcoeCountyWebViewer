-- Table: public.tbl_opengis_sidebar_components

-- DROP TABLE IF EXISTS public.tbl_opengis_sidebar_components;

CREATE TABLE IF NOT EXISTS public.tbl_opengis_sidebar_components
(
    component_type character varying(20) COLLATE pg_catalog."default",
    name character varying(100) COLLATE pg_catalog."default",
    is_secure boolean,
    description character varying(500) COLLATE pg_catalog."default",
    image_url text COLLATE pg_catalog."default",
    component_id integer,
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    component_name character varying(100) COLLATE pg_catalog."default",
    CONSTRAINT tbl_opengis_sidebar_components_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_opengis_sidebar_components
    OWNER to postgres;