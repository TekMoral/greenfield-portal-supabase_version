// Transitional facade for assignments API
// Re-export existing services to enable @features-based imports

export * from '@services/supabase/assignments/assignmentCrud'
export * from '@services/supabase/assignments/assignmentSubmissions'
export * from '@services/supabase/assignments/assignmentManagement'

// Aggregated legacy-style service object
import * as crud from '@services/supabase/assignments/assignmentCrud'
import * as subs from '@services/supabase/assignments/assignmentSubmissions'
import * as mgmt from '@services/supabase/assignments/assignmentManagement'

export const assignmentService = {
  ...crud,
  ...subs,
  ...mgmt,
}
