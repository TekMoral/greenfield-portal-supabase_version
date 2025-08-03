import React, { useState, useEffect } from "react";

const LEVELS = ["Junior", "Senior"];
const CATEGORIES = ["Science", "Art", "Commercial"];

const generateSlug = (name, level, category = null) => {
  const baseName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  const levelSlug = level.toUpperCase();
  const categorySlug = category ? category.toLowerCase() : "";

  return categorySlug
    ? `${baseName}-${levelSlug}-${categorySlug}`
    : `${baseName}-${levelSlug}`;
};

const ClassForm = ({ 
  onSubmit, 
  onCancel,
  mode = "add", 
  initialData = null,
  existingClasses = []
}) => {
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    level: "Junior",
    category: null,
    classTeacherId: "",
    slug: "",
    subjects: []
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || "",
        level: initialData.level || "Junior",
        category: initialData.category || null,
        classTeacherId: initialData.classTeacherId || "",
        slug: initialData.slug || generateSlug(initialData.name, initialData.level, initialData.category),
        subjects: initialData.subjects || []
      });
    } else {
      setFormData({
        id: null,
        name: "",
        level: "Junior",
        category: null,
        classTeacherId: "",
        slug: "",
        subjects: []
      });
    }
    setFormErrors({});
  }, [mode, initialData]);

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Class name is required";
    } else if (formData.name.length < 2) {
      errors.name = "Class name must be at least 2 characters long";
    }

    if (formData.level === "Senior" && !formData.category) {
      errors.category = "Category is required for Senior level classes";
    }

    const duplicateClass = existingClasses.find(
      (cls) =>
        cls.name.toLowerCase() === formData.name.toLowerCase() &&
        cls.level === formData.level &&
        cls.category === formData.category &&
        cls.id !== formData.id
    );

    if (duplicateClass) {
      errors.name = "A class with this name, level, and category already exists";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      if (name === "name" || name === "level" || name === "category") {
        newData.slug = generateSlug(
          name === "name" ? value : prev.name,
          name === "level" ? value : prev.level,
          name === "category" ? value : prev.category
        );
      }

      return newData;
    });

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleLevelChange = (e) => {
    const level = e.target.value;
    setFormData((prev) => {
      const newData = {
        ...prev,
        level,
        category: level === "Junior" ? null : prev.category || "Science",
      };

      newData.slug = generateSlug(prev.name, level, newData.category);
      return newData;
    });

    if (level === "Junior" && formErrors.category) {
      setFormErrors((prev) => ({ ...prev, category: "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const classData = {
      ...formData,
      slug: formData.slug || generateSlug(formData.name, formData.level, formData.category),
    };

    onSubmit(classData);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  formErrors.name ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., SSS 1A"
              />
              {formErrors.name && (
                <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level *
              </label>
              <select
                name="level"
                value={formData.level}
                onChange={handleLevelChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {formData.level === "Senior" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category || ""}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    formErrors.category ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {formErrors.category && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Teacher ID (Optional)
              </label>
              <input
                type="text"
                name="classTeacherId"
                value={formData.classTeacherId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Teacher UID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Slug (Auto-generated)
              </label>
              <input
                type="text"
                value={formData.slug}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

        <div className="flex space-x-3 pt-6">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {mode === "add" ? "Add Class" : "Update Class"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClassForm;