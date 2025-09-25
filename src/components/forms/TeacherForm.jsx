import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import PasswordInput from "../ui/PasswordInput";
import { getSubjects } from "../../services/supabase/subjectService";

const TeacherForm = ({ onSubmit, onCancel, error, loading = false, mode = 'add', defaultValues = {} }) => {
  const [imagePreview, setImagePreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  // Predefined qualifications list
  const qualifications = [
    // Polytechnics
    { value: "OND", label: "OND - Ordinary National Diploma", category: "Polytechnic" },
    { value: "HND", label: "HND - Higher National Diploma", category: "Polytechnic" },
    
    // University - First Degrees
    { value: "B.Ed", label: "B.Ed - Bachelor of Education", category: "University (First Degree)" },
    { value: "B.Sc(Ed)", label: "B.Sc(Ed) - Bachelor of Science Education", category: "University (First Degree)" },
    { value: "B.A(Ed)", label: "B.A(Ed) - Bachelor of Arts Education", category: "University (First Degree)" },
    { value: "B.Sc", label: "B.Sc - Bachelor of Science", category: "University (First Degree)" },
    { value: "B.A", label: "B.A - Bachelor of Arts", category: "University (First Degree)" },
    { value: "B.Tech", label: "B.Tech - Bachelor of Technology", category: "University (First Degree)" },
    { value: "LLB", label: "LLB - Bachelor of Laws", category: "University (First Degree)" },
    { value: "BPharm", label: "BPharm - Bachelor of Pharmacy", category: "University (First Degree)" },
    { value: "BEng", label: "BEng - Bachelor of Engineering", category: "University (First Degree)" },
    
    // Postgraduate
    { value: "PGDE", label: "PGDE - Postgraduate Diploma in Education", category: "Postgraduate" },
    { value: "M.Ed", label: "M.Ed - Master of Education", category: "Postgraduate" },
    { value: "M.Sc", label: "M.Sc - Master of Science", category: "Postgraduate" },
    { value: "M.A", label: "M.A - Master of Arts", category: "Postgraduate" },
    
    // Doctorate
    { value: "PhD", label: "PhD - Doctor of Philosophy", category: "Doctorate" }
  ];

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
  } = useForm({ 
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    shouldUnregister: false
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }

      setSelectedFile(file);
      setValue("profileImage", file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    setValue("profileImage", null);
    document.getElementById("profileImage").value = "";
  };

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true);
        const subjectsData = await getSubjects();
        console.log('📚 Fetched subjects for teacher form:', subjectsData);
        setSubjects(subjectsData || []);
      } catch (error) {
        console.error('❌ Error fetching subjects:', error);
        setSubjects([]);
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  React.useEffect(() => {
    if (defaultValues && defaultValues.profileImageUrl && !selectedFile) {
      setImagePreview(defaultValues.profileImageUrl);
    }
  }, [defaultValues, selectedFile]);

  const onSubmitForm = (data) => {
    const formData = {
      ...data,
      profileImage: selectedFile,
    };
    onSubmit(formData);
    if (mode === 'add') {
      reset();
      setImagePreview("");
      setSelectedFile(null);
    }
  };

  const InputField = ({ label, error, children, required = true }) => (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-red-500 text-sm flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );

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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {mode === 'edit' ? 'Update Teacher Information' : 'Add New Teacher'}
          </h1>
          <p className="text-gray-600">
            {mode === 'edit' 
              ? 'Update the teacher profile details below' 
              : 'Fill in the information to register a new teacher'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmitForm)} className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <fieldset disabled={loading}>
            {/* Profile Image Section */}
            <div className="bg-gradient-to-r from-blue-400 to-indigo-500 px-8 py-4">
              <div className="text-center">
                <label className="block mb-4 text-lg font-semibold text-white">
                  Profile Picture
                </label>
                <div className="relative inline-block">
                  <div className="w-32 h-32 mx-auto border-4 border-white rounded-full flex items-center justify-center overflow-hidden bg-white shadow-lg">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
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
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span className="text-xs text-gray-500">No photo</span>
                      </div>
                    )}
                  </div>
                  <input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="profileImage"
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
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -left-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 cursor-pointer transition-colors duration-200"
                    >
                      <svg
                        className="w-4 h-4"
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
                    </button>
                  )}
                </div>
                <p className="text-blue-100 text-sm mt-4">
                  Click the + button to upload a photo (PNG, JPG up to 5MB)
                </p>
                {selectedFile && (
                  <p className="text-blue-100 text-sm mt-2 font-medium">
                    ✓ {selectedFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
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

                  <InputField label="Full Name" error={errors.name?.message}>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      {...register("name", { required: "Name is required" })}
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.name ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                      }`}
                    />
                  </InputField>

                  <InputField label="Email Address" error={errors.email?.message}>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Invalid email format",
                        },
                      })}
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                      }`}
                    />
                  </InputField>

                  {mode === 'add' && (
                    <InputField label="Password" error={errors.password?.message}>
                      <PasswordInput
                        placeholder="Enter password"
                        {...register("password", {
                          required: "Password is required",
                          minLength: {
                            value: 6,
                            message: "Password must be at least 6 characters",
                          },
                        })}
                        className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.password ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                        }`}
                      />
                    </InputField>
                  )}

                  <InputField label="Phone Number" error={errors.phoneNumber?.message}>
                    <input
                      type="tel"
                      placeholder="Enter 11-digit phone number (e.g., 08012345678)"
                      {...register("phoneNumber", {
                        required: "Phone number is required",
                        pattern: {
                          value: /^[0-9]{11}$/,
                          message: "Phone number must be exactly 11 digits (numbers only, no spaces or special characters)"
                        },
                        validate: {
                          isNumeric: (value) => {
                            if (!/^\d+$/.test(value)) {
                              return "Phone number must contain only numbers";
                            }
                            return true;
                          },
                          correctLength: (value) => {
                            if (value.length !== 11) {
                              return "Phone number must be exactly 11 digits";
                            }
                            return true;
                          },
                          noSpaces: (value) => {
                            if (/\s/.test(value)) {
                              return "Phone number cannot contain spaces";
                            }
                            return true;
                          },
                          validNigerianNumber: (value) => {
                            // Optional: Validate Nigerian phone number format (starts with 070, 080, 081, 090, 091, etc.)
                            if (!/^0[7-9][0-1]\d{8}$/.test(value)) {
                              return "Please enter a valid Nigerian phone number (e.g., 08012345678)";
                            }
                            return true;
                          }
                        }
                      })}
                      onInput={(e) => {
                        // Remove any non-numeric characters as user types
                        e.target.value = e.target.value.replace(/[^0-9]/g, '');
                        // Limit to 11 characters
                        if (e.target.value.length > 11) {
                          e.target.value = e.target.value.slice(0, 11);
                        }
                      }}
                      maxLength="11"
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.phoneNumber ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                      }`}
                    />
                  </InputField>
                </div>

                {/* Professional Information Section */}
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
                      Professional Information
                    </h2>
                  </div>

                  <InputField label="Subject Specialization" error={errors.subject?.message}>
                    {subjectsLoading ? (
                      <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-gray-500">Loading subjects...</span>
                      </div>
                    ) : (
                      <select
                        {...register("subject", { required: "Subject specialization is required" })}
                        className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.subject ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                        }`}
                      >
                        <option value="">Select subject specialization</option>
                        <option value="General">General (Can teach any subject)</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.name}>
                            {subject.name} ({subject.department ? subject.department.charAt(0).toUpperCase() + subject.department.slice(1) : 'General'})
                          </option>
                        ))}
                      </select>
                    )}
                  </InputField>

                  <InputField label="Qualification" error={errors.qualification?.message}>
                    <select
                      {...register("qualification", { required: "Qualification is required" })}
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.qualification ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                      }`}
                    >
                      <option value="">Select qualification</option>
                      
                      {/* Polytechnic Qualifications */}
                      <optgroup label="📚 Polytechnic">
                        {qualifications
                          .filter(q => q.category === "Polytechnic")
                          .map((qual) => (
                            <option key={qual.value} value={qual.value}>
                              {qual.label}
                            </option>
                          ))}
                      </optgroup>
                      
                      {/* University First Degrees */}
                      <optgroup label="🎓 University (First Degree)">
                        {qualifications
                          .filter(q => q.category === "University (First Degree)")
                          .map((qual) => (
                            <option key={qual.value} value={qual.value}>
                              {qual.label}
                            </option>
                          ))}
                      </optgroup>
                      
                      {/* Postgraduate Qualifications */}
                      <optgroup label="🎯 Postgraduate">
                        {qualifications
                          .filter(q => q.category === "Postgraduate")
                          .map((qual) => (
                            <option key={qual.value} value={qual.value}>
                              {qual.label}
                            </option>
                          ))}
                      </optgroup>
                      
                      {/* Doctorate */}
                      <optgroup label="🏆 Doctorate">
                        {qualifications
                          .filter(q => q.category === "Doctorate")
                          .map((qual) => (
                            <option key={qual.value} value={qual.value}>
                              {qual.label}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </InputField>

                  <InputField label="Date Hired" error={errors.dateHired?.message}>
                    <input
                      type="date"
                      {...register("dateHired", {
                        required: "Date hired is required",
                        validate: {
                          notFuture: (value) => {
                            const selectedDate = new Date(value);
                            const today = new Date();
                            today.setHours(23, 59, 59, 999); // Set to end of today
                            
                            if (selectedDate > today) {
                              return "Date hired cannot be in the future";
                            }
                            return true;
                          },
                          validDate: (value) => {
                            const selectedDate = new Date(value);
                            if (isNaN(selectedDate.getTime())) {
                              return "Please enter a valid date";
                            }
                            return true;
                          },
                          validYear: (value) => {
                            const year = new Date(value).getFullYear();
                            const currentYear = new Date().getFullYear();
                            
                            // Check if year is 4 digits and reasonable range
                            if (year < 1900) {
                              return "Year must be 1900 or later";
                            }
                            if (year > currentYear) {
                              return "Year cannot be in the future";
                            }
                            if (year.toString().length !== 4) {
                              return "Year must be exactly 4 digits";
                            }
                            return true;
                          },
                          reasonableDate: (value) => {
                            const selectedDate = new Date(value);
                            const minDate = new Date('1900-01-01');
                            
                            if (selectedDate < minDate) {
                              return "Date hired must be after January 1, 1900";
                            }
                            return true;
                          }
                        }
                      })}
                      max={new Date().toISOString().split('T')[0]} // Set max to today's date
                      min="1900-01-01" // Set minimum date
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.dateHired ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300 focus:border-blue-500"
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Select the date when the teacher was hired (cannot be in the future)
                    </p>
                  </InputField>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center ${
                      loading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    }`}
                  >
                    {loading ? (
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
                        {mode === 'edit' ? 'Update Teacher' : 'Add Teacher'}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 sm:flex-none py-4 px-6 rounded-lg font-semibold text-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
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
                      Please fill in all required fields correctly before submitting.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
};

export default TeacherForm;