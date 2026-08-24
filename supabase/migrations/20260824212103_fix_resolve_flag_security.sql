create or replace function public.resolve_flag (
  flag_id    uuid,
  resolution text
)
  returns json
  language plpgsql
  security definer
  AS $function$
DECLARE
  v_flag RECORD;
BEGIN
  -- ▼▼▼ NEW GUARD ▼▼▼
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required.');
  END IF;
  IF get_user_role(auth.uid()) NOT IN ('moderator', 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions.');
  END IF;
  -- ▲▲▲ NEW GUARD ▲▲▲

  SELECT * INTO v_flag FROM flags WHERE id = flag_id AND status = 'open';
    
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Flag not found or already resolved');
  END IF;
  
  UPDATE flags 
  SET status = resolution::flag_status_enum, resolved_by = auth.uid(), resolved_at = now()
  WHERE id = flag_id;
  
  UPDATE farsi_editions SET flag_count = GREATEST(flag_count - 1, 0) WHERE id = v_flag.edition_id;
  
  RETURN json_build_object('success', true);


END;
$function$;

REVOKE EXECUTE ON FUNCTION public.resolve_flag(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_flag(uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.resolve_flag(uuid, text) TO authenticated;
