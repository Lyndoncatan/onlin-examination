-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Basic user access" ON public.profiles;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create new safe policies
CREATE POLICY "Admin can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Users can manage own profile" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id);

-- Also fix other policies that might have similar issues
DROP POLICY IF EXISTS "Admins can manage exams" ON public.exams;
CREATE POLICY "Admins can manage exams" 
ON public.exams 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can read all attempts" ON public.exam_attempts;
CREATE POLICY "Admins can read all attempts" 
ON public.exam_attempts 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions" 
ON public.questions 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can read all answers" ON public.student_answers;
CREATE POLICY "Admins can read all answers" 
ON public.student_answers 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "Admins can manage subjects" 
ON public.subjects 
FOR ALL 
USING (public.get_current_user_role() = 'admin');