-- Table: public.tbl_security_roles

-- DROP TABLE IF EXISTS public.tbl_security_roles;

CREATE TABLE IF NOT EXISTS public.tbl_security_roles
(
    id integer NOT NULL DEFAULT nextval('tbl_security_roles_id_seq'::regclass),
    name character varying COLLATE pg_catalog."default" NOT NULL,
    azure_ad_group_id character varying COLLATE pg_catalog."default",
    description character varying COLLATE pg_catalog."default",
    azure_tenant_id character varying COLLATE pg_catalog."default",
    azure_app_id character varying COLLATE pg_catalog."default",
    CONSTRAINT tbl_security_roles_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_security_roles
    OWNER to postgres;
-- Index: idx_usp_get_security_roles

-- DROP INDEX IF EXISTS public.idx_usp_get_security_roles;

CREATE INDEX IF NOT EXISTS idx_usp_get_security_roles
    ON public.tbl_security_roles USING btree
    (azure_tenant_id COLLATE pg_catalog."default" ASC NULLS LAST, azure_app_id COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=90)
    TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_security_roles
    CLUSTER ON idx_usp_get_security_roles;