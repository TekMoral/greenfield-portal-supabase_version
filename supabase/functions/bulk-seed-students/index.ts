import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface BulkSeedStudentsRequest {
  // Names and genders
  female_names?: string[]
  male_names?: string[]

  // Admissions and email strategy
  admission_prefix?: string // default 'STU'
  admission_pad_length?: number // default 5 e.g. STU10001
  starting_number?: number // default 10001
  email_domain?: string // default 'example.com'
  default_password?: string // default to admission_number

  // Classes: either provide explicit class_ids to choose randomly from,
  // or provide class_names to resolve server-side, otherwise auto-detect.
  class_ids?: string[]
  class_id?: string // if provided, overrides random selection per student
  class_names?: string[] // optional class names to resolve to IDs
  class_filters?: { level?: string; grade?: string; category?: string; name_contains?: string }[] // resolve by fuzzy grade/category
  distribute?: 'random' | 'round_robin' // how to assign across classChoices
  select_all_classes?: boolean // if true, ignore filters and seed all classes

  // Guardian derivation
  guardian_email_domain?: string // if provided, guardian_email becomes mr.<surname>@guardian_email_domain

  // Images: either provide full URLs, or a base URL + filenames per gender
  female_image_urls?: string[]
  male_image_urls?: string[]
  image_base_url?: string // e.g. 'https://your-app.com/students'
  female_image_files?: string[] // e.g. ['girls/001.jpg', 'girls/002.jpg']
  male_image_files?: string[] // e.g. ['boys/001.jpg', 'boys/002.jpg']
  // Storage-backed image selection
  storage_bucket?: string // e.g. 'profile-images'
  female_image_folder?: string // e.g. 'student-profiles/girls-profiles'
  male_image_folder?: string // e.g. 'student-profiles/boys-profiles'
}

interface SeedResult {
  index: number
  full_name: string
  gender: 'female' | 'male'
  admission_number?: string
  email?: string
  class?: { id: string; name?: string }
  date_of_birth?: string
  profile_image?: string | null
  guardian_name?: string
  guardian_phone?: string
  guardian_email?: string | null
  status: 'created' | 'failed'
  error?: string
  id?: string
}

function randomFrom<T>(arr: T[] | undefined): T | undefined {
  if (!arr || arr.length === 0) return undefined
  const i = Math.floor(Math.random() * arr.length)
  return arr[i]
}

function normalizeName(name: string): { first: string; surname: string; full: string } {
  const parts = name.trim().replace(/\s+/g, ' ').split(' ')
  if (parts.length === 1) {
    const first = parts[0]
    const surname = 'Student'
    return { first, surname, full: `${first} ${surname}` }
  }
  const first = parts[0]
  const surname = parts[parts.length - 1]
  return { first, surname, full: `${first} ${surname}` }
}

function padNumber(n: number, len: number) {
  return String(n).padStart(len, '0')
}

function randomInt(min: number, max: number) { // inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDOB(minAge = 12, maxAge = 19): string {
  const now = new Date()
  const age = randomInt(minAge, maxAge)
  const year = now.getFullYear() - age
  const month = randomInt(0, 11) // 0-11
  const day = randomInt(1, 28) // safe day
  const d = new Date(year, month, day)
  return d.toISOString().split('T')[0]
}

function randomNigerianPhoneNumber(): string {
  // Common Nigerian mobile prefixes (local format)
  const localPrefixes = ['070', '080', '081', '090', '091']
  const prefix = localPrefixes[Math.floor(Math.random() * localPrefixes.length)]
  // Generate remaining 8 digits to make an 11-digit local number
  let rest = ''
  for (let i = 0; i < 8; i++) rest += Math.floor(Math.random() * 10).toString()
  return `${prefix}${rest}`
}

function sanitizeName(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
    .replace(/\s+/g, '')
}

function extractLastThreeDigits(adm: string): string {
  const digits = (adm || '').replace(/\D/g, '')
  if (digits.length >= 3) return digits.slice(-3)
  return digits.padStart(3, '0')
}

function generateStudentEmailServer(firstName: string, surname: string, admissionNumber: string, schoolName = 'greenfield'): string {
  const cleanFirst = sanitizeName(firstName)
  const cleanSurname = sanitizeName(surname)
  const surnameInitial = (cleanSurname.charAt(0) || 'x')
  const lastThree = extractLastThreeDigits(admissionNumber)
  const school = sanitizeName(schoolName)
  const local = `${surnameInitial}${cleanFirst}${lastThree}.${school}`
  return `${local}@gmail.com`
}

function pickProfileImage(
  gender: 'female' | 'male',
  params: {
    female_image_urls?: string[]
    male_image_urls?: string[]
    image_base_url?: string
    female_image_files?: string[]
    male_image_files?: string[]
  }
): string | null {
  if (gender === 'female') {
    const url = randomFrom(params.female_image_urls)
    if (url) return String(url)
    const file = randomFrom(params.female_image_files)
    if (file && params.image_base_url) return `${params.image_base_url.replace(/\/$/, '')}/${file.replace(/^\//, '')}`
  } else {
    const url = randomFrom(params.male_image_urls)
    if (url) return String(url)
    const file = randomFrom(params.male_image_files)
    if (file && params.image_base_url) return `${params.image_base_url.replace(/\/$/, '')}/${file.replace(/^\//, '')}`
  }
  const idx = Math.floor(Math.random() * 100)
  const base = gender === 'female' ? 'women' : 'men'
  return `https://randomuser.me/api/portraits/${base}/${idx}.jpg`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors(req) as Response

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const userClient = createUserClient(authHeader)
    await verifyUserRole(userClient, ['admin', 'super_admin'])

    let body: BulkSeedStudentsRequest
    try {
      body = await req.json()
    } catch (_e) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const {
      female_names = [],
      male_names = [],
      admission_prefix = 'STU',
      admission_pad_length = 5,
      starting_number = 10001,
      email_domain = 'example.com',
      default_password,
      class_ids,
      class_id, // explicit override for all students
      class_names,
      class_filters,
      distribute,
      select_all_classes,
      guardian_email_domain,
      female_image_urls,
      male_image_urls,
      image_base_url,
      female_image_files,
      male_image_files,
      storage_bucket,
      female_image_folder,
      male_image_folder,
    } = body

    if (female_names.length === 0 && male_names.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'At least one of female_names or male_names is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createServiceClient()

    // Load class choices
    let classChoices: { id: string; name?: string }[] = []

    if (select_all_classes) {
      const { data: rows, error } = await supabase.from('classes').select('id, name')
      if (error) throw new Error(`Failed to load all classes: ${error.message}`)
      if (!rows || rows.length === 0) throw new Error('No classes found in database')
      classChoices = rows
    } else if (class_id) {
      const { data: cls, error: classErr } = await supabase.from('classes').select('id, name').eq('id', class_id).single()
      if (classErr || !cls) throw new Error('Invalid class_id provided')
      classChoices = [cls]
    } else if (class_ids && class_ids.length > 0) {
      const { data: rows, error } = await supabase.from('classes').select('id, name').in('id', class_ids)
      if (error) throw new Error(`Failed to load classes: ${error.message}`)
      if (!rows || rows.length === 0) throw new Error('No classes found for provided class_ids')
      classChoices = rows
    } else if (class_names && class_names.length > 0) {
      // Resolve class names to IDs (exact first, fallback to ilike for each name)
      const { data: exactRows, error: exactErr } = await supabase
        .from('classes')
        .select('id, name')
        .in('name', class_names)
      if (exactErr) throw new Error(`Failed to query classes by names: ${exactErr.message}`)
      let rows = exactRows || []

      if ((rows?.length || 0) < class_names.length) {
        const foundMap = new Map<string, { id: string; name?: string }>()
        for (const r of rows) foundMap.set(r.id, r)
        for (const nm of class_names) {
          const already = rows.find(r => (r.name || '').toLowerCase() === nm.toLowerCase())
          if (already) continue
          const { data: fuzzyRows, error: fuzzyErr } = await supabase
            .from('classes')
            .select('id, name')
            .ilike('name', `%${nm}%`)
          if (fuzzyErr) throw new Error(`Failed to fuzzy query class '${nm}': ${fuzzyErr.message}`)
          for (const fr of (fuzzyRows || [])) foundMap.set(fr.id, fr)
        }
        rows = Array.from(foundMap.values())
      }

      if (!rows || rows.length === 0) throw new Error('No classes found for provided class_names')
      classChoices = rows
    } else if (class_filters && class_filters.length > 0) {
      // Resolve classes using level/category columns when present, plus flexible grade matching on name
      const foundMap = new Map<string, { id: string; name?: string }>()
      const norm = (s?: string) => (s || '').trim()

      for (const f of class_filters) {
        try {
          let q = supabase.from('classes').select('id, name, level, category')
          if (f.level) q = q.ilike('level', norm(f.level))
          if (f.category) q = q.ilike('category', norm(f.category))

          // Build OR conditions for grade/name contains variants
          const orParts: string[] = []
          if (f.grade) {
            const g = norm(f.grade)
            const gSpace = g.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
            const gCompact = gSpace.replace(/\s+/g, '')
            orParts.push(`name.ilike.*${gSpace}*`)
            orParts.push(`name.ilike.*${gCompact}*`)
          }
          if (f.name_contains) {
            const t = norm(f.name_contains)
            orParts.push(`name.ilike.*${t}*`)
          }
          if (orParts.length > 0) {
            q = q.or(orParts.join(','))
          }

          const { data: rows, error } = await q
          if (error) throw error
          for (const r of (rows || [])) foundMap.set(r.id, r)
        } catch (_e) {
          // ignore bad filter silently to allow others to match
        }
      }

      const rows = Array.from(foundMap.values())
      if (!rows || rows.length === 0) throw new Error('No classes found for provided class_filters')
      classChoices = rows
    } else {
      // Auto-detect JSS 3 .. SSS 3 by common names
      const desired = ['JSS 3', 'SSS 1', 'SSS 2', 'SSS 3']
      let { data: rows, error } = await supabase.from('classes').select('id, name').in('name', desired)
      if (error) throw new Error(`Failed to query classes: ${error.message}`)
      if (!rows || rows.length === 0) {
        const { data: fuzzy, error: fuzzyErr } = await supabase
          .from('classes')
          .select('id, name')
          .or('name.ilike.*JSS*3*,name.ilike.*SSS*1*,name.ilike.*SSS*2*,name.ilike.*SSS*3*')
        if (fuzzyErr) throw new Error(`Failed to query classes by pattern: ${fuzzyErr.message}`)
        rows = fuzzy || []
      }
      // Final filter: keep only likely matches
      classChoices = (rows || []).filter((r) => {
        const n = (r.name || '').toUpperCase().replace(/\s+/g, '')
        return n.includes('JSS3') || n.includes('SSS1') || n.includes('SSS2') || n.includes('SSS3')
      })
      if (classChoices.length === 0) {
        throw new Error('No suitable classes found. Provide class_ids to select from.')
      }
    }

    const yearYY = new Date().getFullYear().toString().slice(-2)

    type Gender = 'female' | 'male'
    const buildTasks = (names: string[], gender: Gender) => names.map((name, idx) => ({ idx, name: name.trim(), gender }))
    const tasks = [
      ...buildTasks(female_names, 'female'),
      ...buildTasks(male_names, 'male'),
    ]

    // Precompute admission numbers and emails to mirror UI rules
    const meta = tasks.map((t, idx) => {
      const { first, surname } = normalizeName(t.name)
      const initial = (surname.charAt(0) || 'X').toUpperCase()
      const initialLower = initial.toLowerCase()
      return { idx, gender: t.gender, first, surname, initial, initialLower }
    })

    // Group by initial to minimize DB lookups
    const byInitial = new Map<string, { idx: number; first: string; surname: string }[]>()
    for (const m of meta) {
      if (!byInitial.has(m.initial)) byInitial.set(m.initial, [])
      byInitial.get(m.initial)!.push({ idx: m.idx, first: m.first, surname: m.surname })
    }

    const admissionByIndex = new Map<number, string>()

    // For each initial, get the last used number for pattern Initial%YY, then assign sequentially
    for (const [initial, arr] of byInitial.entries()) {
      const pattern = `${yearYY}${initial}%`
      let startNum = 1
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('admission_number')
          .eq('role', 'student')
          .like('admission_number', pattern)
          .order('admission_number', { ascending: false })
          .limit(1)
        if (error) throw error
        if (data && data.length > 0) {
          const last = data[0].admission_number as string
          const tail = last.slice(-3)
          const lastNum = parseInt(tail) || 0
          startNum = lastNum + 1
        }
      } catch (_) {
        // leave startNum = 1
      }
      // Assign sequential numbers to this group's tasks
      for (const { idx } of arr) {
        const padded = String(startNum).padStart(3, '0')
        const adm = `${yearYY}${initial}${padded}`
        admissionByIndex.set(idx, adm)
        startNum++
      }
    }

    // Build emails map exactly like utils/emailGenerator.js
    const emailByIndex = new Map<number, string>()
    for (const m of meta) {
      const adm = admissionByIndex.get(m.idx)!
      const email = generateStudentEmailServer(m.first, m.surname, adm, 'greenfield')
      emailByIndex.set(m.idx, email)
    }

    // Prepare storage-backed image URLs if folders are provided and arrays are empty
    const preparedMaleUrls: string[] = []
    const preparedFemaleUrls: string[] = []
    try {
      if (storage_bucket && male_image_folder && (!male_image_urls || male_image_urls.length === 0)) {
        const { data: files, error } = await supabase.storage.from(storage_bucket).list(male_image_folder, { limit: 1000 })
        if (!error && files) {
          for (const f of files) {
            if (!f.name || f.name.endsWith('/')) continue
            const { data: pub } = await supabase.storage.from(storage_bucket).getPublicUrl(`${male_image_folder}/${f.name}`)
            if (pub?.publicUrl) preparedMaleUrls.push(pub.publicUrl)
          }
        }
      }
      if (storage_bucket && female_image_folder && (!female_image_urls || female_image_urls.length === 0)) {
        const { data: files, error } = await supabase.storage.from(storage_bucket).list(female_image_folder, { limit: 1000 })
        if (!error && files) {
          for (const f of files) {
            if (!f.name || f.name.endsWith('/')) continue
            const { data: pub } = await supabase.storage.from(storage_bucket).getPublicUrl(`${female_image_folder}/${f.name}`)
            if (pub?.publicUrl) preparedFemaleUrls.push(pub.publicUrl)
          }
        }
      }
    } catch (_) { /* ignore storage errors to keep seeding robust */ }

    const results: SeedResult[] = []

    // Identify acting user for audit logs
    let actingUserId: string | null = null

    // Index for round-robin distribution (if enabled)
    let rrIndex = 0
    try {
      const { data: { user } } = await userClient.auth.getUser()
      actingUserId = user?.id ?? null
    } catch { /* ignore */ }

    for (const [i, t] of tasks.entries()) {
      const { first, surname, full } = normalizeName(t.name)

      const admission_number = admissionByIndex.get(i)!
      const email = emailByIndex.get(i)!

      const selectedClass = (distribute === 'round_robin')
        ? classChoices[rrIndex++ % classChoices.length]
        : classChoices[Math.floor(Math.random() * classChoices.length)]

      const profile_image = pickProfileImage(t.gender, {
        female_image_urls: (preparedFemaleUrls.length > 0 ? preparedFemaleUrls : female_image_urls),
        male_image_urls: (preparedMaleUrls.length > 0 ? preparedMaleUrls : male_image_urls),
        image_base_url,
        female_image_files,
        male_image_files,
      })

      // Guardian derived from surname
      const guardian_name = `Mr ${surname}`
      const guardian_email = guardian_email_domain
        ? `mr.${surname.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@${guardian_email_domain}`
        : null

      const guardian_phone = randomNigerianPhoneNumber()

      const dob = randomDOB(12, 19)

      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: admission_number,
          user_metadata: {
            full_name: full,
            role: 'student',
          },
          email_confirm: true,
        })
        if (authError || !authData.user) throw new Error(`Auth createUser failed: ${authError?.message}`)

        const profileData = {
          id: authData.user.id,
          email,
          full_name: full,
          role: 'student',
          admission_number,
          class_id: selectedClass.id,
          date_of_birth: dob,
          gender: t.gender,
          phone_number: null,
          guardian_name,
          guardian_phone,
          guardian_email,
          address: null,
          admission_date: new Date().toISOString().split('T')[0],
          is_active: true,
          status: 'active',
          profile_image,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          require_password_change: true,
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .upsert(profileData, { onConflict: 'id' })
          .select()
          .single()

        if (profileError || !profile) {
          try { await supabase.auth.admin.deleteUser(authData.user.id) } catch { /* ignore */ }
          throw new Error(`Profile upsert failed: ${profileError?.message}`)
        }

        try {
          await supabase.from('audit_logs').insert([
            {
              user_id: actingUserId,
              action: 'bulk_create_student',
              resource_type: 'student',
              resource_id: profile.id,
              details: {
                email,
                admission_number,
                class: { id: selectedClass.id, name: selectedClass.name },
                gender: t.gender,
              },
              created_at: new Date().toISOString(),
            }
          ])
        } catch { /* ignore audit failures */ }

        results.push({
          index: i,
          full_name: full,
          gender: t.gender,
          admission_number,
          email,
          class: { id: selectedClass.id, name: selectedClass.name },
          date_of_birth: dob,
          profile_image,
          guardian_name,
          guardian_phone,
          guardian_email,
          status: 'created',
          id: profile.id,
        })
      } catch (e: any) {
        results.push({
          index: i,
          full_name: full,
          gender: t.gender,
          status: 'failed',
          error: e?.message || 'Unknown error',
        })
      }
    }

    const summary = {
      requested: tasks.length,
      created: results.filter(r => r.status === 'created').length,
      failed: results.filter(r => r.status === 'failed').length,
    }

    return new Response(
      JSON.stringify({ success: true, data: { summary, results } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('Error bulk seeding students:', error)
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
