-- FUNCTION: public.usp_get_user_storage(character varying, character varying)

-- DROP FUNCTION IF EXISTS public.usp_get_user_storage(character varying, character varying);

CREATE OR REPLACE FUNCTION public.usp_get_user_storage(
	user_oid character varying,
	encryption_key character varying)
    RETURNS TABLE(storage_value text) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$

DECLARE 
	output_value text;
BEGIN
	SELECT PGP_SYM_DECRYPT(store.storage_data,encryption_key) into output_value FROM public.tbl_user_storage store WHERE store.oid = user_oid LIMIT 1;
	IF output_value IS NOT NULL THEN
		UPDATE public.tbl_user_storage store SET last_access=CURRENT_TIMESTAMP WHERE store.oid = user_oid;
	END IF;
	RETURN QUERY SELECT output_value as storage_value;
END;
$BODY$;

ALTER FUNCTION public.usp_get_user_storage(character varying, character varying)
    OWNER TO postgres;
