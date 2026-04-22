-- Grant admin role to the user "apka hoon" (the website owner)
INSERT INTO public.user_roles (user_id, role)
VALUES ('fa79681f-55c8-45ba-ac9f-df124204d621', 'admin')
ON CONFLICT DO NOTHING;