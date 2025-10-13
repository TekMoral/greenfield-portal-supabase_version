-- RPC function to allow teachers to update/resubmit rejected exam results
-- This function has SECURITY DEFINER to bypass RLS restrictions

CREATE OR REPLACE FUNCTION update_exam_result_by_teacher(
  p_student_id UUID,
  p_subject_id UUID,
  p_term TEXT,
  p_year INTEGER,
  p_teacher_id UUID,
  p_test_score NUMERIC,
  p_exam_score NUMERIC,
  p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_id UUID;
  v_total_score NUMERIC;
  v_result JSONB;
BEGIN
  -- Calculate total score
  v_total_score := COALESCE(p_test_score, 0) + COALESCE(p_exam_score, 0);
  
  -- Find existing result
  SELECT id INTO v_result_id
  FROM exam_results
  WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND term = p_term
    AND year = p_year
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If result exists, update it
  IF v_result_id IS NOT NULL THEN
    UPDATE exam_results
    SET 
      test_score = p_test_score,
      exam_score = p_exam_score,
      total_score = v_total_score,
      status = 'submitted',
      remarks = p_remarks,
      teacher_id = p_teacher_id,
      submitted_at = NOW(),
      updated_at = NOW(),
      admin_comments = NULL  -- Clear rejection comments on resubmission
    WHERE id = v_result_id
    RETURNING jsonb_build_object(
      'id', id,
      'student_id', student_id,
      'subject_id', subject_id,
      'term', term,
      'year', year,
      'test_score', test_score,
      'exam_score', exam_score,
      'total_score', total_score,
      'status', status,
      'remarks', remarks,
      'teacher_id', teacher_id,
      'submitted_at', submitted_at,
      'updated_at', updated_at
    ) INTO v_result;
    
    RETURN v_result;
  ELSE
    -- If no result exists, insert new one
    INSERT INTO exam_results (
      student_id,
      subject_id,
      term,
      year,
      test_score,
      exam_score,
      total_score,
      status,
      remarks,
      teacher_id,
      submitted_at,
      created_at,
      updated_at,
      is_published
    ) VALUES (
      p_student_id,
      p_subject_id,
      p_term,
      p_year,
      p_test_score,
      p_exam_score,
      v_total_score,
      'submitted',
      p_remarks,
      p_teacher_id,
      NOW(),
      NOW(),
      NOW(),
      FALSE
    )
    RETURNING jsonb_build_object(
      'id', id,
      'student_id', student_id,
      'subject_id', subject_id,
      'term', term,
      'year', year,
      'test_score', test_score,
      'exam_score', exam_score,
      'total_score', total_score,
      'status', status,
      'remarks', remarks,
      'teacher_id', teacher_id,
      'submitted_at', submitted_at,
      'updated_at', updated_at
    ) INTO v_result;
    
    RETURN v_result;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (teachers)
GRANT EXECUTE ON FUNCTION update_exam_result_by_teacher(UUID, UUID, TEXT, INTEGER, UUID, NUMERIC, NUMERIC, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION update_exam_result_by_teacher IS 'Allows teachers to submit or update exam results, including resubmitting rejected results. Uses SECURITY DEFINER to bypass RLS.';
