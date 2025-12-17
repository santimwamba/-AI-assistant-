-- Create function to notify about new signups
CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Call the signup-notification edge function
  SELECT
    net.http_post(
      url := concat(current_setting('app.settings.supabase_url'), '/functions/v1/signup-notification'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key'))
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'created_at', NEW.created_at
      )
    ) INTO request_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created_notify ON auth.users;
CREATE TRIGGER on_auth_user_created_notify
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_signup();