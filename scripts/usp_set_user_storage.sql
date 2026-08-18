-- FUNCTION: public.usp_set_user_storage(character varying, character varying, text, character varying)

-- DROP FUNCTION IF EXISTS public.usp_set_user_storage(character varying, character varying, text, character varying);

CREATE OR REPLACE FUNCTION public.usp_set_user_storage(
	user_oid character varying,
	user_email character varying,
	input_value text,
	encryption_key character varying)
    RETURNS void
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$

DECLARE 
	recordExists BOOLEAN := false;
BEGIN
select exists(select oid from public.tbl_user_storage where oid=user_oid) into recordExists;

IF (recordExists) THEN
	UPDATE public.tbl_user_storage
		SET  storage_data=PGP_SYM_ENCRYPT(input_value,encryption_key),  last_edit=CURRENT_TIMESTAMP
		WHERE oid=user_oid; 
ELSE
	INSERT INTO public.tbl_user_storage(
		oid, storage_data, email)
		VALUES (user_oid, PGP_SYM_ENCRYPT(input_value,encryption_key), user_email);

END IF;

END; 
$BODY$;

ALTER FUNCTION public.usp_set_user_storage(character varying, character varying, text, character varying)
    OWNER TO postgres;
