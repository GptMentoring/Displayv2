/*
  # Create admin user

  1. Changes
    - Creates an admin user in auth.users table
    - Sets up initial password for admin login
    
  2. Security
    - Uses secure password hashing
    - Creates verified user account
*/

-- Create admin user if not exists
DO $$
DECLARE
  admin_email text := 'admin@example.com';
  admin_password text := 'admin123';  -- This is a temporary password, change it after first login!
BEGIN
  -- Check if user already exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = admin_email
  ) THEN
    -- Insert new admin user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;