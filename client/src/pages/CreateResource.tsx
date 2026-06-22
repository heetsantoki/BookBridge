import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Upload, BrainCircuit, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(2, { message: 'Title is required' }),
  author: z.string().min(2, { message: 'Author is required' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
  resourceType: z.enum(['Textbook', 'Notes', 'Previous Year Paper', 'Lab Manual', 'Project Report', 'E-book/PDF']),
  department: z.string().min(2, { message: 'Department selection is required' }),
  semester: z.coerce.number().min(1).max(8, { message: 'Semester must be between 1 and 8' }),
  courseCode: z.string().min(2, { message: 'Course Code is required' }),
  condition: z.enum(['New', 'Like New', 'Good', 'Fair', 'Poor']),
  exchangeType: z.enum(['Borrow', 'Rent', 'Buy', 'Free']),
  price: z.coerce.number().min(0, { message: 'Price cannot be negative' }).optional()
});

type FormFields = z.infer<typeof formSchema>;

const departments = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electrical Engineering',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Business Administration',
  'Humanities & Sciences'
];

export const CreateResource: React.FC = () => {
  const navigate = useNavigate();
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormFields>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resourceType: 'Textbook',
      condition: 'Good',
      exchangeType: 'Borrow',
      price: 0
    }
  });

  // Watch form fields for AI description prompt context and price field toggling
  const watchFields = watch();
  const selectedExchangeType = watch('exchangeType');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const generateAIDescription = async () => {
    const { title, author, resourceType, department, courseCode, condition } = watchFields;
    if (!title) {
      alert('Please enter a Title to generate description.');
      return;
    }
    setGeneratingDesc(true);
    setFormError(null);
    try {
      const res = await axios.post('http://localhost:5000/api/ai/generate-description', {
        title,
        author,
        resourceType,
        department,
        courseCode,
        condition
      });
      if (res.data.success) {
        setValue('description', res.data.description);
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to generate description with AI. Using local rules fallback.');
    } finally {
      setGeneratingDesc(false);
    }
  };

  const onSubmit = async (data: FormFields) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('author', data.author);
      formData.append('description', data.description);
      formData.append('resourceType', data.resourceType);
      formData.append('department', data.department);
      formData.append('semester', String(data.semester));
      formData.append('courseCode', data.courseCode);
      formData.append('condition', data.condition);
      formData.append('exchangeType', data.exchangeType);
      formData.append('price', String(data.price || 0));

      if (coverPhoto) {
        formData.append('images', coverPhoto);
      }

      const res = await axios.post('http://localhost:5000/api/resources', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to create resource. Verify all fields are valid.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-left">
      <button 
        onClick={() => navigate(-1)} 
        className="inline-flex items-center gap-1 text-xs text-dark-400 hover:text-dark-200 font-bold uppercase tracking-wider mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Go Back
      </button>

      <div className="glass-card p-6 sm:p-8 animate-fade-in">
        <div className="flex items-center gap-3 border-b border-dark-850 pb-5 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 shadow-glass-primary">
            <PlusIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-outfit text-2xl font-extrabold text-white">Share Academic Resource</h1>
            <p className="text-xs text-dark-400">List books, notes, exam papers, or reports within your campus</p>
          </div>
        </div>

        {formError && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {/* Cover Photo Drag and Drop */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-4 flex flex-col gap-2">
              <span className="text-xs font-bold text-dark-350">Cover Image</span>
              <div className="border-2 border-dashed border-dark-800 rounded-2xl aspect-[3/4] flex flex-col items-center justify-center bg-dark-950/40 relative overflow-hidden group hover:border-brand-500/40 transition-colors cursor-pointer">
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-xs text-white font-semibold">Change Photo</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-dark-500 mb-2 group-hover:text-brand-400 transition-colors" />
                    <span className="text-xs text-dark-450 font-medium">Select cover file</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>

            {/* Title & Author Info */}
            <div className="md:col-span-8 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-dark-350">Resource Title</label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to Algorithms"
                  className="glass-input"
                  {...register('title')}
                />
                {errors.title && <span className="text-[10px] text-red-400 font-semibold">{errors.title.message}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-dark-350">Author Name</label>
                <input
                  type="text"
                  placeholder="e.g. Thomas H. Cormen"
                  className="glass-input"
                  {...register('author')}
                />
                {errors.author && <span className="text-[10px] text-red-400 font-semibold">{errors.author.message}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-dark-350">Resource Type</label>
                  <select className="glass-input appearance-none bg-dark-950" {...register('resourceType')}>
                    <option value="Textbook">Textbook</option>
                    <option value="Notes">Study Notes</option>
                    <option value="Previous Year Paper">Previous Year Paper</option>
                    <option value="Lab Manual">Lab Manual</option>
                    <option value="Project Report">Project Report</option>
                    <option value="E-book/PDF">E-book / PDF</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-dark-350">Material Condition</label>
                  <select className="glass-input appearance-none bg-dark-950" {...register('condition')}>
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-dark-350">Department</label>
              <select className="glass-input appearance-none bg-dark-950" {...register('department')}>
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {errors.department && <span className="text-[10px] text-red-400 font-semibold">{errors.department.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-dark-350">Target Semester</label>
              <select className="glass-input appearance-none bg-dark-950" {...register('semester')}>
                <option value="">Select Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
              {errors.semester && <span className="text-[10px] text-red-400 font-semibold">{errors.semester.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-dark-350">Course Code</label>
              <input
                type="text"
                placeholder="e.g. CS302"
                className="glass-input uppercase"
                {...register('courseCode')}
              />
              {errors.courseCode && <span className="text-[10px] text-red-400 font-semibold">{errors.courseCode.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-dark-850 pt-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-dark-350">Exchange Options</label>
              <select className="glass-input appearance-none bg-dark-950" {...register('exchangeType')}>
                <option value="Borrow">Share (Borrow)</option>
                <option value="Rent">Rent out</option>
                <option value="Buy">Sell (Purchase)</option>
                <option value="Free">Giveaway (Free)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-dark-350">Price (INR)</label>
              <input
                type="number"
                placeholder="₹0"
                disabled={selectedExchangeType === 'Free' || selectedExchangeType === 'Borrow'}
                className="glass-input disabled:opacity-40 disabled:cursor-not-allowed"
                {...register('price')}
              />
              {errors.price && <span className="text-[10px] text-red-400 font-semibold">{errors.price.message}</span>}
            </div>
          </div>

          {/* Description Section with AI generator */}
          <div className="flex flex-col gap-1.5 border-t border-dark-850 pt-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-dark-350">Description</label>
              <button
                type="button"
                onClick={generateAIDescription}
                disabled={generatingDesc}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-400 border border-brand-500/25 hover:bg-brand-500/5 transition-all duration-200"
              >
                {generatingDesc ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Generating description...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-3.5 w-3.5" /> AI Auto-Generate
                  </>
                )}
              </button>
            </div>
            <textarea
              placeholder="Provide a detailed description about the resource. Outline the syllabus topics covered, print condition, writing notes on pages, etc..."
              className="glass-input h-32 resize-none"
              {...register('description')}
            />
            {errors.description && <span className="text-[10px] text-red-400 font-semibold">{errors.description.message}</span>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="glass-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 mt-4"
          >
            {submitting ? 'Creating Listing...' : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Reusable SVG PlusIcon helper
const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
