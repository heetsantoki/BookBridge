import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getImageUrl } from '../utils/image';
import {
  Users, BookOpen, MessageSquare, ShieldAlert, Award, Clock,
  RefreshCw, CheckCircle2, XCircle, ArrowUpRight, BarChart3
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdminData = async () => {
    setRefreshing(true);
    try {
      const [statsRes, verRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/stats'),
        axios.get('http://localhost:5000/api/admin/verifications')
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (verRes.data.success) setVerifications(verRes.data.pendingStudents);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleVerify = async (studentId: string, action: 'approve' | 'reject') => {
    try {
      const res = await axios.put(`http://localhost:5000/api/admin/verify/${studentId}`, { action });
      if (res.data.success) {
        alert(res.data.message);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Verification update failed.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-left animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-7 bg-dark-800/40 rounded w-48 mb-2" />
            <div className="h-3.5 bg-dark-800/40 rounded w-96" />
          </div>
          <div className="h-8 bg-dark-800/40 rounded w-28" />
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="glass-card p-6 flex items-center justify-between border border-dark-850">
              <div className="flex flex-col gap-2">
                <div className="h-3 bg-dark-800/40 rounded w-24" />
                <div className="h-6 bg-dark-800/40 rounded w-16" />
              </div>
              <div className="h-11 w-11 bg-dark-800/40 rounded-xl" />
            </div>
          ))}
        </div>

        {/* Columns Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="glass-card p-6">
              <div className="h-5 bg-dark-800/40 rounded w-48 mb-6 pb-3 border-b border-dark-850" />
              <div className="flex flex-col gap-5">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-4 bg-dark-950/40 border border-dark-850 rounded-2xl flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-dark-800/40 rounded-lg" />
                        <div className="flex flex-col gap-1.5">
                          <div className="h-3.5 bg-dark-800/40 rounded w-24" />
                          <div className="h-2.5 bg-dark-800/40 rounded w-36" />
                        </div>
                      </div>
                      <div className="h-2.5 bg-dark-800/40 rounded w-12" />
                    </div>
                    <div className="h-44 bg-dark-800/40 rounded-xl w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="glass-card p-6">
              <div className="h-5 bg-dark-800/40 rounded w-48 mb-6" />
              <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <div className="h-3 bg-dark-800/40 rounded w-32" />
                      <div className="h-3 bg-dark-800/40 rounded w-8" />
                    </div>
                    <div className="h-6 bg-dark-800/40 rounded-lg w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const deptCounts = stats?.departmentWise || [];
  const maxDeptCount = Math.max(...deptCounts.map((d: any) => d.count), 1);

  const popularResources = stats?.mostRequested || [];
  const maxPopularCount = Math.max(...popularResources.map((p: any) => p.requestCount), 1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-left animate-fade-in">
      <div className="flex items-center justify-between mb-8 border-b border-white/[0.06] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-red-500 shadow-glass-primary animate-pulse-slow">
            <ShieldAlert className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-outfit text-2xl font-extrabold text-white">Administrator Portal</h1>
            <p className="text-xs text-dark-400 font-medium mt-0.5">Platform health diagnostics, student credentials audits, and directory statistics</p>
          </div>
        </div>
        <button
          onClick={fetchAdminData}
          disabled={refreshing}
          className="glass-btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 hover:-translate-y-0.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      {/* METRIC BOX CAROUSEL GRID */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="glass-card p-6 flex items-center justify-between border-white/[0.05] bg-dark-900/10">
            <div className="text-left">
              <span className="text-[9px] text-dark-500 font-bold uppercase tracking-widest">Total Users</span>
              <p className="text-2xl font-extrabold text-white mt-1.5">{stats.totalUsers}</p>
            </div>
            <div className="h-11 w-11 bg-brand-500/10 text-brand-400 rounded-xl flex items-center justify-center border border-brand-500/20 shadow-glow-indigo">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="glass-card p-6 flex items-center justify-between border-white/[0.05] bg-dark-900/10">
            <div className="text-left">
              <span className="text-[9px] text-dark-500 font-bold uppercase tracking-widest">Active Listings</span>
              <p className="text-2xl font-extrabold text-white mt-1.5">{stats.totalResources}</p>
            </div>
            <div className="h-11 w-11 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-glow-emerald">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>

          <div className="glass-card p-6 flex items-center justify-between border-white/[0.05] bg-dark-900/10">
            <div className="text-left">
              <span className="text-[9px] text-dark-500 font-bold uppercase tracking-widest">Exchanges Initiated</span>
              <p className="text-2xl font-extrabold text-white mt-1.5">{stats.totalTransactions}</p>
            </div>
            <div className="h-11 w-11 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center border border-sky-500/20 shadow-glow-sky">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>

          <div className="glass-card p-6 flex items-center justify-between border-white/[0.05] bg-dark-900/10">
            <div className="text-left">
              <span className="text-[9px] text-dark-500 font-bold uppercase tracking-widest">Verification Queue</span>
              <p className="text-2xl font-extrabold text-amber-400 mt-1.5">{stats.pendingVerifications}</p>
            </div>
            <div className="h-11 w-11 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20 shadow-glow-amber">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Student ID verification queue */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="glass-card p-6 border-white/[0.05] bg-dark-900/10">
            <h3 className="text-xs font-bold text-dark-200 border-b border-white/[0.06] pb-3.5 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Clock className="h-4.5 w-4.5 text-amber-400 animate-pulse" /> Student Verification Queue ({verifications.length})
            </h3>

            {verifications.length === 0 ? (
              <div className="text-center py-20 text-xs text-dark-500 font-bold uppercase tracking-wider italic">
                All verification requests have been cleared. Queue is currently empty.
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {verifications.map((student) => (
                  <div key={student._id} className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex flex-col gap-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={student.avatar} alt="" className="h-9 w-9 rounded-lg bg-dark-950 border border-white/[0.06] object-cover" />
                        <div className="text-left">
                          <span className="text-xs font-extrabold text-dark-100 block">{student.name}</span>
                          <span className="text-[10px] text-dark-450 block mt-0.5">{student.email}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">
                        {new Date(student.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* ID Card Image Viewer */}
                    {student.studentIdImage && (
                      <div className="relative border border-white/[0.06] rounded-xl overflow-hidden aspect-[16/9] w-full bg-dark-950 flex items-center justify-center group shadow-inner">
                        <img
                          src={getImageUrl(student.studentIdImage)}
                          alt="Student ID Card Upload"
                          className="h-full w-full object-contain p-2"
                        />
                        <a 
                          href={student.studentIdImage} 
                          target="_blank" 
                          rel="noreferrer"
                          className="absolute bottom-3 right-3 bg-black/75 hover:bg-black text-[9px] text-white py-1.5 px-3 rounded-lg border border-white/[0.08] font-bold uppercase tracking-wider flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          Enlarge ID <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3 justify-end border-t border-white/[0.04] pt-3.5">
                      <button
                        onClick={() => handleVerify(student._id, 'approve')}
                        className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-1.5 px-4 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md shadow-emerald-650/10 transition-all duration-200"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={() => handleVerify(student._id, 'reject')}
                        className="bg-white/[0.02] border border-white/[0.08] text-red-400 hover:text-red-300 font-bold py-1.5 px-4 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all duration-200"
                      >
                        <XCircle className="h-4 w-4" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Directory analytics */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Department uploads chart */}
          <div className="glass-card p-6 border-white/[0.05] bg-dark-900/10">
            <h3 className="text-xs font-bold text-dark-200 border-b border-white/[0.06] pb-3.5 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <BarChart3 className="h-4.5 w-4.5 text-brand-400" /> Department Distribution
            </h3>
            {deptCounts.length === 0 ? (
              <div className="text-xs text-dark-500 py-8 text-center italic">No uploads recorded</div>
            ) : (
              <div className="flex flex-col gap-4">
                {deptCounts.map((dept: any) => {
                  const percentage = Math.round((dept.count / maxDeptCount) * 100);
                  return (
                    <div key={dept._id} className="flex flex-col gap-1.5 text-left">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-dark-250 font-bold max-w-[180px] truncate" title={dept._id}>{dept._id || 'General'}</span>
                        <span className="text-dark-450 font-bold uppercase tracking-wider">{dept.count} item{dept.count !== 1 && 's'}</span>
                      </div>
                      <div className="w-full bg-dark-950 rounded-full h-2 overflow-hidden border border-white/[0.06]">
                        <div 
                          className="bg-brand-500 h-full rounded-full transition-all duration-500 shadow-glow-indigo" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Most requested listings chart */}
          <div className="glass-card p-6 border-white/[0.05] bg-dark-900/10">
            <h3 className="text-xs font-bold text-dark-200 border-b border-white/[0.06] pb-3.5 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Award className="h-4.5 w-4.5 text-accent-400 animate-pulse" /> Most Popular Resources
            </h3>
            {popularResources.length === 0 ? (
              <div className="text-xs text-dark-500 py-8 text-center italic">No trade requests recorded</div>
            ) : (
              <div className="flex flex-col gap-4">
                {popularResources.map((item: any) => {
                  const percentage = Math.round((item.requestCount / maxPopularCount) * 100);
                  const resourceName = item.resource?.title || 'Unknown Resource';
                  return (
                    <div key={item.resource?._id || Math.random()} className="flex flex-col gap-1.5 text-left">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-dark-250 font-bold truncate max-w-[200px]" title={resourceName}>{resourceName}</span>
                        <span className="text-accent-400 font-bold uppercase tracking-wider">{item.requestCount} req{item.requestCount !== 1 && 's'}</span>
                      </div>
                      <div className="w-full bg-dark-950 rounded-full h-2 overflow-hidden border border-white/[0.06]">
                        <div 
                          className="bg-accent-500 h-full rounded-full transition-all duration-500 shadow-glow-emerald" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};
