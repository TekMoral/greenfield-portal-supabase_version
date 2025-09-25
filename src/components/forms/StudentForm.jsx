// src/components/students/StudentForm.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { studentService, classService } from "../../services/supabase";
import { generateStudentEmail } from "../../utils/emailGenerator";

const StudentForm = ({ onSubmit, onCancel, defaultValues = {}, mode = "add", classes: classesProp = [], imagePreview: imagePreviewProp = null, onImageSelect }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [classes, setClasses] = useState(Array.isArray(classesProp) ? classesProp : []);
  const [imagePreview, setImagePreview] = useState(
    defaultValues?.Image || null
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    setValue,
    trigger,
  } = useForm({
    defaultValues,
    mode: "onChange",
  });

  const watchedFields = watch(["first_name", "surname", "admission_number"]);
  const surname = watch("surname");
  const first_name = watch("first_name");
  const admission_number = watch("admission_number");

  // Auto-generate admission number
  const generateAdmissionNumber = useCallback(async () => {
    if (!surname || surname.length === 0) {
      console.log("⚠️ No surname provided for admission number generation");
      return;
    }

    const initial = surname.charAt(0).toUpperCase();
    const year = new Date().getFullYear().toString().slice(-2);

    try {
      console.log("🔄 Generating admission number for initial:", initial);
      const nextNumber = await studentService.getNextAdmissionNumber(initial);
      const padded = String(nextNumber).padStart(3, "0");
      const admissionNumber = `${year}${initial}${padded}`;

      console.log("✅ Generated admission number:", admissionNumber);
      setValue("admission_number", admissionNumber);
      trigger("admission_number"); // Trigger validation
    } catch (error) {
      console.error("❌ Failed to generate admission number:", error);
    }
  }, [surname, setValue, trigger]);

  // Auto-generate email in a simple, memorable format
  const generateEmail = useCallback(() => {
    if (!first_name?.trim() || !surname?.trim() || !admission_number?.trim()) {
      console.log("⚠️ Missing data for email generation:", {
        first_name: first_name?.trim(),
        surname: surname?.trim(),
        admission_number: admission_number?.trim(),
      });
      return;
    }

    const studentData = {
      firstName: first_name.trim(),
      surname: surname.trim(),
      admissionNumber: admission_number.trim()
    };

    const result = generateStudentEmail(studentData);

    if (result.success) {
      console.log("✅ Email generated successfully:", result.data);
      console.log("📧 Email components:", result.components);
      setValue("email", result.data);
      trigger("email");
    } else {
      console.error("❌ Failed to generate email:", result.error);
      // Fallback to a simple format if generation fails
      const fallbackEmail = `student.${Date.now()}@gmail.com`;
      console.log("🔄 Using fallback email:", fallbackEmail);
      setValue("email", fallbackEmail);
      trigger("email");
    }
  }, [first_name, surname, admission_number, setValue, trigger]);

  // Watch surname changes to trigger admission number generation
  useEffect(() => {
    if (surname?.trim() && mode === "add") {
      console.log("🔄 Surname changed, generating admission number...");
      generateAdmissionNumber();
    }
  }, [surname, mode, generateAdmissionNumber]);

  // Watch name/admission number changes to trigger email generation
  useEffect(() => {
    if (
      first_name?.trim() &&
      surname?.trim() &&
      admission_number?.trim() &&
      mode === "add"
    ) {
      console.log("🔄 Data available, generating email...");
      generateEmail();
    }
  }, [first_name, surname, admission_number, mode, generateEmail]);

  // Fetch classes once or use provided classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (Array.isArray(classesProp) && classesProp.length > 0) {
        setClasses(classesProp);
        return;
      }
      try {
        console.log("🔄 Fetching classes for student form...");
        const result = await classService.getAllClasses();

        if (result && result.success) {
          console.log("✅ Classes fetched successfully:", result.data?.length || 0);
          setClasses(Array.isArray(result.data) ? result.data : []);
        } else if (Array.isArray(result)) {
          console.log("✅ Classes fetched (legacy format):", result.length);
          setClasses(result);
        } else {
          console.error("❌ Failed to fetch classes:", result?.error || "Unknown error");
          setClasses([]);
        }
      } catch (error) {
        console.error("❌ Error fetching classes:", error);
        setClasses([]);
      }
    };
    fetchClasses();
  }, [classesProp]);

  // Reset form on defaultValues change
  useEffect(() => {
    reset(defaultValues);
    setImagePreview(defaultValues?.profileImageUrl || null);
    setSelectedImage(null);
    // Normalize date_of_birth for date input
    const dob = defaultValues?.date_of_birth;
    if (dob) {
      const normalizedDob = typeof dob === 'string' ? dob.split('T')[0] : new Date(dob).toISOString().split('T')[0];
      setValue('date_of_birth', normalizedDob);
    }
  }, [defaultValues, reset, setValue]);

  // Handle edit mode initialization
  useEffect(() => {
    if (
      mode === "edit" &&
      defaultValues &&
      Array.isArray(classes) &&
      classes.length > 0
    ) {
      if (defaultValues.class_id) {
        setValue("class_id", defaultValues.class_id);
        // Populate class fields based on existing class_id
        const selectedClass = classes.find(
          (cls) => cls.id === defaultValues.class_id
        );
        if (selectedClass) {
          setValue("category", selectedClass.category || "");
          setValue("className", selectedClass.name);
          setValue("level", selectedClass.level);
        }
      }
    }
  }, [mode, defaultValues, classes, setValue]);

  // Function to populate class-related fields when class_id changes
  const populateClassFields = useCallback(
    (class_id) => {
      if (!class_id || !Array.isArray(classes)) {
        setValue("category", "");
        setValue("className", "");
        setValue("level", "");
        return;
      }

      const selectedClass = classes.find((cls) => cls.id === class_id);
      if (selectedClass) {
        setValue("category", selectedClass.category || "");
        setValue("className", selectedClass.name);
        setValue("level", selectedClass.level);
      }
    },
    [classes, setValue]
  );

  // Watch for class_id changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === "class_id") {
        populateClassFields(value.class_id);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, populateClassFields]);

  // Capitalize name fields
  const handleNameChange = (field) => (e) => {
    const formatted = e.target.value
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    setValue(field, formatted);
    trigger(field);
  };

  const formatPhoneNumber = (value) =>
    value.replace(/\D/g, "").replace(/(\d{4})(\d{3})(\d{4})/, "$1-$2-$3");

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Final submission handler
  const onFormSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitMessage("");
    try {
      if (!Array.isArray(classes)) {
        alert("Classes not loaded. Please wait and try again.");
        return;
      }

      const selectedClass = classes.find((cls) => cls.id === data.class_id);
      if (!selectedClass?.id) {
        alert("Please select a valid class.");
        return;
      }

      const formDataWithImage = {
        ...data,
        profileImage: selectedImage || null,
        profileImageUrl: imagePreview || null,
        password: data.admission_number,
        class_id: selectedClass.id,
        className: selectedClass.name,
        level: selectedClass.level,
        category: selectedClass.category,
      };

      console.log("🔍 Form data being submitted:", formDataWithImage);
      console.log("🔍 Individual field values:", {
        first_name: data.first_name,
        surname: data.surname,
        admission_number: data.admission_number,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        class_id: data.class_id,
        email: data.email,
        contact: data.contact,
        guardian_name: data.guardian_name
      });

      await onSubmit(formDataWithImage);
      if (mode === "add") {
        reset();
        setSelectedImage(null);
        setImagePreview(null);
      }
    } catch (error) {
      console.error("Save error:", error);
      setSubmitMessage("Error saving student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const validationRules = {
    first_name: {
      required: "First name is required",
      minLength: { value: 2, message: "Min 2 characters" },
      pattern: { value: /^[A-Za-z\s]+$/, message: "Letters only" },
    },
    surname: {
      required: "Surname is required",
      minLength: { value: 2, message: "Min 2 characters" },
      pattern: { value: /^[A-Za-z\s]+$/, message: "Letters only" },
    },
    admission_number: {
      required: "Admission number is required",
      validate: async (value) => {
        if (mode === "edit") return true; // Skip validation for edit mode
        try {
          const exists = await studentService.checkAdmissionNumberExists(value);
          return !exists || "Admission number already exists";
        } catch (error) {
          console.error("Error validating admission number:", error);
          return true; // Allow submission if validation fails
        }
      },
    },
    class_id: { required: "Class is required" },
    gender: { required: "Gender is required" },
    date_of_birth: {
      required: "Date of birth is required",
      validate: (value) => {
        const age = new Date().getFullYear() - new Date(value).getFullYear();
        return age < 8 || age > 25 ? "Age must be 8–25 years" : true;
      },
    },
    contact: {
      pattern: { value: /^[\d+()-\s]+$/, message: "Invalid phone number" },
      minLength: { value: 10, message: "At least 10 digits" },
    },
    email: {
      // Email is auto-generated, so no validation needed
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {mode === "edit" ? "Update Student Information" : "Add New Student"}
          </h1>
          <p className="text-gray-600">
            {mode === "edit"
              ? "Update the student details below"
              : "Fill in the information to register a new student"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Profile Image Section */}
          <div className="bg-gradient-to-r from-blue-400 to-indigo-500 px-8 py-4">
            <div className="text-center">
              <label className="block mb-4 text-lg font-semibold text-white">
                Profile Picture
              </label>
              <div className="relative inline-block">
                <div className="w-32 h-32 mx-auto border-4 border-white rounded-full flex items-center justify-center overflow-hidden bg-white shadow-lg">
                  {(imagePreviewProp ?? imagePreview) ? (
                    <img
                      src={imagePreviewProp ?? imagePreview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <svg
                        className="w-12 h-12 text-gray-400 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="text-xs text-gray-500">No photo</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onImageSelect || handleImageSelect}
                  className="hidden"
                  id="profile-image"
                />
                <label
                  htmlFor="profile-image"
                  className="absolute -bottom-2 -right-2 bg-white text-blue-600 p-2 rounded-full shadow-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </label>
              </div>
              <p className="text-blue-100 text-sm mt-4">
                Click the + button to upload a photo
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-8">
            {/* Submit Message */}
            {submitMessage && (
              <div
                className={`mb-6 p-4 rounded-lg border-l-4 ${
                  submitMessage.includes("Error")
                    ? "bg-red-50 border-red-400 text-red-700"
                    : "bg-green-50 border-green-400 text-green-700"
                }`}
              >
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {submitMessage.includes("Error") ? (
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-5-5 1.414-1.414L11 14.172l7.586-7.586L20 8l-9 9z" />
                    ) : (
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-5-5 1.414-1.414L11 14.172l7.586-7.586L20 8l-9 9z" />
                    )}
                  </svg>
                  {submitMessage}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information Section */}
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Personal Information
                  </h2>
                </div>

                {/* First Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("first_name", validationRules.first_name)}
                    onChange={handleNameChange("first_name")}
                    className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.first_name
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                    }`}
                    placeholder="Enter first name"
                  />
                  {errors.first_name && (
                    <p className="text-sm text-red-600 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-5-5 1.414-1.414L11 14.172l7.586-7.586L20 8l-9 9z" />
                      </svg>
                      {errors.first_name.message}
                    </p>
                  )}
                </div>

                {/* Surname */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Surname <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("surname", validationRules.surname)}
                    onChange={handleNameChange("surname")}
                    className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.surname
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                    }`}
                    placeholder="Enter surname"
                  />
                  {errors.surname && (
                    <p className="text-sm text-red-600 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-5-5 1.414-1.414L11 14.172l7.586-7.586L20 8l-9 9z" />
                      </svg>
                      {errors.surname.message}
                    </p>
                  )}
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("gender", validationRules.gender)}
                    className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.gender
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                    }`}
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  {errors.gender && (
                    <p className="text-sm text-red-600 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-5-5 1.414-1.414L11 14.172l7.586-7.586L20 8l-9 9z" />
                      </svg>
                      {errors.gender.message}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register("date_of_birth", validationRules.date_of_birth)}
                    className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.date_of_birth
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                    }`}
                    max={new Date().toISOString().split("T")[0]}
                  />
                  {errors.date_of_birth && (
                    <p className="text-sm text-red-600 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-5-5 1.414-1.414L11 14.172l7.586-7.586L20 8l-9 9z" />
                      </svg>
                      {errors.date_of_birth.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Academic Information Section */}
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    Academic Information
                  </h2>
                </div>

                {/* Admission Number */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Admission Number <span className="text-red-500">*</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                      Auto-generated
                    </span>
                  </label>
                  <div className="flex gap-3">
                    <input
                      {...register(
                        "admission_number",
                        validationRules.admission_number
                      )}
                      className={`flex-1 px-4 py-3 border-2 rounded-lg bg-gray-50 font-mono text-center tracking-wider ${
                        errors.admission_number
                          ? "border-red-300"
                          : "border-gray-200"
                      }`}
                      placeholder="Will be generated from surname"
                      readOnly
                    />
                  </div>
                  {errors.admission_number && (
                    <p className="text-sm text-red-600 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-5-5 1.414-1.414L11 14.172l7.586-7.586L20 8l-9 9z" />
                      </svg>
                      {errors.admission_number.message}
                    </p>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      This admission number will also be the student's default
                      password.
                    </p>
                  </div>
                </div>

                {/* Class Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("class_id", validationRules.class_id)}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setValue("class_id", selectedId);
                      trigger("class_id");
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.class_id
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                    }`}
                  >
                    <option value="">Select a class</option>
                    {Array.isArray(classes) &&
                      classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} - {cls.level}
                          {cls.category ? ` (${cls.category})` : ""}
                        </option>
                      ))}
                  </select>
                  {errors.class_id && (
                    <p className="text-sm text-red-600 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-5-5 1.414-1.414L11 14.172l7.586-7.586L20 8l-9 9z" />
                      </svg>
                      {errors.class_id.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Email Address
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full ml-2">
                      Auto-generated
                    </span>
                  </label>
                  <input
                    {...register("email", validationRules.email)}
                    className={`w-full px-4 py-3 border-2 rounded-lg bg-gray-50 font-mono text-sm ${
                      errors.email ? "border-red-300" : "border-gray-200"
                    }`}
                    readOnly
                    placeholder="Email will be generated automatically"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-5-5 1.414-1.414L11 14.172l7.586-7.586L20 8l-9 9z" />
                      </svg>
                      {errors.email.message}
                    </p>
                  )}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-700 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Format: firstletterfirstnamedigits.schoolname@gmail.com
                    </p>
                    <p className="text-xs text-green-600 mt-1 ml-5">
                      Example: jjohn123.greenfield@gmail.com
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="pb-4 border-b border-gray-200 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-3.5 1.998a11.05 11.05 0 006.073 6.073l1.999-3.5a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Contact Information
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Guardian Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Guardian Name
                  </label>
                  <input
                    {...register("guardian_name")}
                    onChange={handleNameChange("guardian_name")}
                    className="w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-200 hover:border-gray-300 focus:border-blue-500"
                    placeholder="Enter guardian's full name"
                  />
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    {...register("contact", validationRules.contact)}
                    className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.contact
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                    }`}
                    placeholder="e.g., 0803-123-4567"
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setValue("contact", formatted);
                    }}
                  />
                  {errors.contact && (
                    <p className="text-sm text-red-600 flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-5-5 1.414-1.414L11 14.172l7.586-7.586L20 8l-9 9z" />
                      </svg>
                      {errors.contact.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Cancel Button */}
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center ${
                      isSubmitting
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Cancel
                  </button>
                )}
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className={`${onCancel ? 'flex-1' : 'w-full'} py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center ${
                    isSubmitting || !isValid
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {mode === "edit" ? "Update Student" : "Add Student"}
                    </>
                  )}
                </button>
              </div>

              {/* Form validation status */}
              {!isValid && Object.keys(errors).length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-5-5 1.414-1.414L11 14.172l7.586-7.586L20 8l-9 9z" />
                    </svg>
                    Please fill in all required fields correctly before
                    submitting.
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentForm;
