import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import PasswordInput from "../ui/PasswordInput";
import { SaveButton, CancelButton } from "../ui/ActionButtons";
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
    formState: { errors },
    reset,
    setValue,
  } = useForm({ defaultValues });

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
    reset();
    setImagePreview("");
    setSelectedFile(null);
  };

  const InputField = ({ label, error, children }) => (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label} <span className="text-red-500">*</span>
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
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{mode === 'edit' ? 'Edit Teacher' : 'Add New Teacher'}</h2>
            <p className="text-blue-100 text-sm">{mode === 'edit' ? 'Update the teacher profile details' : 'Fill in the details to create a new teacher profile'}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmitForm)} className="p-8">
        <fieldset disabled={loading}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-start">
            <svg className="w-5 h-5 mr-2 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Profile Image Section */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Profile Picture
          </h3>
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Profile preview"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-white shadow-lg">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                id="profileImage"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="profileImage"
                className="cursor-pointer inline-flex items-center px-6 py-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all duration-200 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Choose Photo
              </label>
              <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB</p>
              {selectedFile && (
                <p className="text-sm text-green-600 mt-1 font-medium">✓ {selectedFile.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <InputField label="Full Name" error={errors.name?.message}>
            <input
              type="text"
              placeholder="Enter full name"
              {...register("name", { required: "Name is required" })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.name ? "border-red-500 bg-red-50" : "border-gray-300"
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.email ? "border-red-500 bg-red-50" : "border-gray-300"
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.password ? "border-red-500 bg-red-50" : "border-gray-300"
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.phoneNumber ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
            />
          </InputField>

          <InputField label="Subject Specialization" error={errors.subject?.message}>
            {subjectsLoading ? (
              <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-500">Loading subjects...</span>
              </div>
            ) : (
              <select
                {...register("subject", { required: "Subject specialization is required" })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.subject ? "border-red-500 bg-red-50" : "border-gray-300"
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.qualification ? "border-red-500 bg-red-50" : "border-gray-300"
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.dateHired ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Select the date when the teacher was hired (cannot be in the future)
            </p>
          </InputField>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
          <SaveButton type="submit" loading={loading} disabled={loading} className="flex-1 sm:flex-none" />
          <CancelButton onClick={onCancel} disabled={loading} className="flex-1 sm:flex-none" />
        </div>
      </fieldset>
      </form>
    </div>
  );
};

export default TeacherForm;