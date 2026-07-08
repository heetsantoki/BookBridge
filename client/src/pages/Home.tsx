import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookCard } from '../components/BookCard';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Plus, BookOpen, Sparkles, BrainCircuit, X, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

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

const resourceTypes = ['Textbook', 'Notes', 'Previous Year Paper', 'Lab Manual', 'Project Report', 'E-book/PDF'];
const exchangeTypes = ['Borrow', 'Rent', 'Buy', 'Free', 'Exchange', 'Both'];
const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

export const Home: React.FC = () => {
  const { user } = useAuth();
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedExchange, setSelectedExchange] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');

  // Resources state
  const [resources, setResources] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (selectedDept) params.department = selectedDept;
      if (selectedSem) params.semester = selectedSem;
      if (selectedType) params.resourceType = selectedType;
      if (selectedExchange) params.exchangeType = selectedExchange;
      if (selectedCondition) params.condition = selectedCondition;

      const res = await axios.get('http://localhost:5000/api/resources', { params });
      if (res.data.success) {
        setResources(res.data.resources);
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!user) return;
    setLoadingAI(true);
    try {
      const res = await axios.get('http://localhost:5000/api/ai/recommendations');
      if (res.data.success) {
        setRecommendations(res.data.recommendations);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedDept, selectedSem, selectedType, selectedExchange, selectedCondition]);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources();
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedDept('');
    setSelectedSem('');
    setSelectedType('');
    setSelectedExchange('');
    setSelectedCondition('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Banner alerting users about pending status */}
      {user && !user.isVerified && (
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 text-left backdrop-blur-md">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-outfit text-sm font-extrabold text-amber-200">Account Pending Verification</h4>
              <p className="text-xs text-dark-400 mt-1 max-w-2xl leading-normal">
                {user.studentIdImage 
                  ? 'Your Student ID has been uploaded and is waiting for administrator approval. You can browse resources, but posting new resource listings requires active approval.' 
                  : 'Please upload a Student ID card photo under your profile configuration to unlock listing and exchange privileges.'
                }
              </p>
            </div>
          </div>
          {!user.studentIdImage && (
            <Link to="/auth" className="glass-btn-primary py-2 px-5 text-xs whitespace-nowrap bg-amber-600 hover:bg-amber-700 shadow-none">
              Verify Account Now
            </Link>
          )}
        </div>
      )}

      {/* Hero Visual Section */}
      <div className="relative rounded-3xl overflow-hidden mb-12 p-8 sm:p-12 bg-gradient-to-br from-brand-950/80 to-dark-950/40 border border-brand-500/10 shadow-glass">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-brand-300 bg-brand-500/10 border border-brand-500/20 mb-4 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 animate-spin-slow" /> University Circle Hub
          </span>
          <h1 className="font-outfit text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Peer-to-Peer Academic Resource Exchange
          </h1>
          <p className="text-base text-dark-300 leading-relaxed mb-6">
            Bridge the textbook gap. Borrow, rent, buy, or download notes, lab manuals, project reports, and exam papers directly from verified students on campus.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/dashboard" className="glass-btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Share a Resource
            </Link>
            <a href="#browse-catalog" className="glass-btn-secondary">
              Browse Catalog
            </a>
          </div>
        </div>
      </div>

      {/* AI Recommendations Dashboard */}
      {user && recommendations.length > 0 && (
        <div className="mb-12 text-left">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-6 w-6 text-brand-400 animate-pulse" />
              <h2 className="font-outfit text-xl sm:text-2xl font-extrabold text-white">AI-Recommended for You</h2>
            </div>
            <button 
              onClick={fetchRecommendations} 
              disabled={loadingAI}
              className="p-1.5 hover:bg-dark-900 rounded-lg text-dark-400 hover:text-dark-200 transition-colors"
              title="Refresh suggestions"
            >
              <RefreshCw className={`h-4 w-4 ${loadingAI ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map((item) => (
              <div key={item.resource._id} className="relative flex flex-col h-full group">
                {/* AI Reason Badge overlay */}
                <div className="absolute top-2 right-2 bg-brand-600/90 text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs border border-brand-500 z-10 max-w-[200px] truncate">
                  AI Suggestion
                </div>
                <BookCard resource={item.resource} />
                <div className="mt-2.5 p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 text-[11px] text-brand-300 italic text-left">
                  {item.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH AND GRID CATALOG SECTION */}
      <div id="browse-catalog" className="flex flex-col lg:flex-row gap-8 items-start text-left">
        {/* Filters Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0 glass-card p-6 divide-y divide-dark-850">
          <div className="pb-5">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</span>
              <button onClick={clearFilters} className="text-xs text-brand-400 hover:text-brand-300 font-medium">Clear All</button>
            </div>
            
            {/* Dept Filter */}
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-dark-400">Department</label>
              <select 
                value={selectedDept} 
                onChange={(e) => setSelectedDept(e.target.value)}
                className="glass-input py-2 text-xs bg-dark-950"
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Semester Filter */}
            <div className="flex flex-col gap-2.5 mt-4">
              <label className="text-xs font-bold text-dark-400">Semester</label>
              <select 
                value={selectedSem} 
                onChange={(e) => setSelectedSem(e.target.value)}
                className="glass-input py-2 text-xs bg-dark-950"
              >
                <option value="">All Semesters</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex flex-col gap-2.5 mt-4">
              <label className="text-xs font-bold text-dark-400">Resource Type</label>
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="glass-input py-2 text-xs bg-dark-950"
              >
                <option value="">All Types</option>
                {resourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Exchange Filter */}
            <div className="flex flex-col gap-2.5 mt-4">
              <label className="text-xs font-bold text-dark-400">Exchange Mode</label>
              <select 
                value={selectedExchange} 
                onChange={(e) => setSelectedExchange(e.target.value)}
                className="glass-input py-2 text-xs bg-dark-950"
              >
                <option value="">All Modes</option>
                {exchangeTypes.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {/* Condition Filter */}
            <div className="flex flex-col gap-2.5 mt-4">
              <label className="text-xs font-bold text-dark-400">Condition</label>
              <select 
                value={selectedCondition} 
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="glass-input py-2 text-xs bg-dark-950"
              >
                <option value="">Any Condition</option>
                {conditions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </aside>

        {/* Catalog Main Content */}
        <div className="flex-grow w-full">
          {/* Search Header */}
          <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-dark-500" />
              <input
                type="text"
                placeholder="Search title, authors, course codes (e.g. CS-301)..."
                className="glass-input pl-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="glass-btn-primary px-6 flex items-center gap-2 text-sm shrink-0">
              <Search className="h-4 w-4" /> Search
            </button>
            <button 
              type="button" 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden glass-btn-secondary p-3 flex items-center justify-center shrink-0"
            >
              <Filter className="h-5 w-5" />
            </button>
          </form>

          {/* Mobile Filter Sheet */}
          {showMobileFilters && (
            <div className="lg:hidden glass-card p-6 mb-6 flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <span className="font-bold">Filters</span>
                <button onClick={() => setShowMobileFilters(false)} className="text-dark-400 hover:text-dark-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="glass-input text-xs bg-dark-950">
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={selectedSem} onChange={(e) => setSelectedSem(e.target.value)} className="glass-input text-xs bg-dark-950">
                  <option value="">All Semesters</option>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="glass-input text-xs bg-dark-950">
                  <option value="">All Types</option>
                  {resourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={selectedExchange} onChange={(e) => setSelectedExchange(e.target.value)} className="glass-input text-xs bg-dark-950">
                  <option value="">All Modes</option>
                  {exchangeTypes.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <button onClick={clearFilters} className="glass-btn-secondary text-xs w-full">Clear Filters</button>
            </div>
          )}

          {/* Resource Grid list */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="glass-card p-5 flex flex-col gap-4 animate-pulse border border-dark-850">
                  <div className="bg-dark-800/40 rounded-xl aspect-[4/3] w-full" />
                  <div className="flex flex-col gap-2.5">
                    <div className="h-3 bg-dark-800/40 rounded w-1/3" />
                    <div className="h-4 bg-dark-800/40 rounded w-3/4" />
                    <div className="h-3 bg-dark-800/40 rounded w-1/2" />
                  </div>
                  <div className="h-[1px] bg-dark-800/40" />
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex flex-col gap-1.5">
                      <div className="h-2 bg-dark-800/40 rounded w-12" />
                      <div className="h-3.5 bg-dark-800/40 rounded w-16" />
                    </div>
                    <div className="flex flex-col gap-1.5 text-right">
                      <div className="h-2 bg-dark-800/40 rounded w-12" />
                      <div className="h-3.5 bg-dark-800/40 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-20 rounded-3xl bg-dark-900/20 border border-dark-800 border-dashed">
              <BookOpen className="h-10 w-10 text-dark-500 mx-auto mb-4" />
              <h3 className="font-outfit text-lg font-bold text-dark-200">No resources found</h3>
              <p className="text-xs text-dark-500 mt-1 max-w-sm mx-auto">
                No active listings match your current filters. Try adjusting your keywords or department selectors.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {resources.map((resource) => (
                <BookCard key={resource._id} resource={resource} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
