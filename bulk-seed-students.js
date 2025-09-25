import { createClient } from "@supabase/supabase-js";

// Configure Supabase
const supabaseUrl =
  process.env.SUPABASE_URL || "https://ryiqdiqcmvwdotnrosac.supabase.co";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5aXFkaXFjbXZ3ZG90bnJvc2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTM2MzAsImV4cCI6MjA2OTAyOTYzMH0.xPxrEU24W2zRftlL2X3VbT_yfMLt-8eq56QfhM3JzFg";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin credentials (required to authorize the Edge Function)
// Use environment variables; fallback to provided values if not set (for local convenience only)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "folashade@greenfield.edu.ng";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Folashade123";

// Image base URL (Supabase Storage public path)
const image_base_url =
  process.env.IMAGE_BASE_URL ||
  "https://ryiqdiqcmvwdotnrosac.supabase.co/storage/v1/object/public/profile-images/student-profiles/girls-profiles";

// Names to seed (male only for this batch)
const male_names = [
  "Adekunle Oladimeji",
  "Oluwaseun Afolabi",
  "Temidayo Akinbola",
  "Olamide Omotayo",
  "Oluwatobi Ajibola",
  "Kolawole Adebanjo",
  "Ayoola Ogunjimi",
  "Oluwaseyi Olaniyan",
  "Adedapo Akinyemi",
  "Tobi Adebajo",
  "Samuel Olawale",
  "Oluwafemi Aluko",
  "Kayode Shonubi",
  "Oluwadamilare Adeoti",
  "Sulaiman Abdullahi",
  "Abdulrahman Usman",
  "Bello Kabir",
  "Yusuf Ibrahim",
  "Haruna Musa",
  "Ahmad Suleiman",
  "Oluwaseun Oyelakin",
  "Opeyemi Akinfenwa",
  "Tobiloba Adebanwi",
  "Oluwadurotimi Ogunlana",
  "Olujimi Fashola",
  "Oluwakayode Adefarasin",
  "Chukwuma Okorie",
  "Ifeanyi Nwankwo",
  "Obiora Chukwu",
  "Chinedu Anozie",
  "Ebube Okeke",
  "Kelechi Nwafor",
  "Somto Udeh",
  "Chijioke Obioma",
  "Uchenna Opara",
  "Emeka Ezeani",
  "Chibuzor Nnamdi",
  "Kosiso Onyekachi",
  "Amara Ubah",
  "Ekene Chukwudi",
  "Olumide Adewunmi",
  "Akinola Oyebanjo",
  "Olawale Shittu",
  "Bamidele Akinbode",
  "Taye Balogun",
  "Ridwan Olatunji",
  "Moruf Adepoju",
  "Oluwapelumi Ojo",
  "Segun Aremu",
];

// File names in your Storage folder (spaces and parentheses are OK)
const male_image_files = [
  "boys (1).webp",
  "boys (2).webp",
  "boys (3).webp",
  "boys (4).webp",
  "boys (5).webp",
  "boys (6).webp",
  "boys (7).webp",
  "boys (8).webp",
  "boys (9).webp",
  "boys (10).webp",
  "boys (11).webp",
  "boys (12).webp",
  "boys (13).webp",
  "boys (14).webp",
  "boys (15).webp",
  "boys (16).webp",
  "boys (17).webp",
  "boys (18).webp",
  "boys (19).webp",
  "boys (20).webp",
  "boys (21).webp",
  "boys (22).webp",
  "boys (23).webp",
  "boys (24).webp",
  "boys (25).webp",
  "boys (26).webp",
  "boys (27).webp",
  "boys (28).webp",
  "boys (29).webp",
  "boys (30).webp",
  "boys (31).webp",
  "boys (32).webp",
  "boys (33).webp",
  "boys (34).webp",
  "boys (35).webp",
  "boys (36).webp",
  "boys (37).webp",
  "boys (38).webp",
  "boys (39).webp",
];

// Seed all classes with male students
const select_all_classes = true;
const storage_bucket = "profile-images";
const male_image_folder = "student-profiles/boys-profiles";

async function main() {
  try {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error(
        "Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables."
      );
      console.error("Set them before running:");
      console.error("  set ADMIN_EMAIL=admin@example.com");
      console.error("  set ADMIN_PASSWORD=secret");
      process.exit(1);
    }

    // 1) Sign in as admin to obtain a JWT (required by Edge Function)
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
    if (signInError || !signInData?.session) {
      console.error(
        "Failed to sign in as admin:",
        signInError?.message || "Unknown error"
      );
      process.exit(1);
    }

    const accessToken = signInData.session.access_token;

    // 2) Invoke the Edge Function with your data
    try {
      const { data, error } = await supabase.functions.invoke(
        "bulk-seed-students",
        {
          body: {
            male_names,
            male_image_files,
            select_all_classes,
            distribute: "round_robin",
            storage_bucket,
            male_image_folder,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (error) {
        throw error;
      }

      console.log("Seeding result summary:", data?.data?.summary || data);
    } catch (err) {
      console.error("Error seeding students:", err?.message || err);
      // Print function response body if available
      if (err?.context) {
        try {
          const text = await err.context.text();
          console.error("Function response:", text);
        } catch (_) {
          /* ignore */
        }
      }
      process.exit(1);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    process.exit(1);
  }
}

main();
