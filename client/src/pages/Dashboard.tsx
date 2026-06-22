import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { BookCard } from '../components/BookCard';
import { getImageUrl } from '../utils/image';
import {
  Heart, RefreshCw, Clock, ShieldAlert, Award, FileText, MessageSquare, Mail, Phone
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, uploadIdCard } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'listings' | 'requests' | 'wishlist'>('listings');
  const [loading, setLoading] = useState(true);

  // Data states
  const [myResources, setMyResources] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);

  // Local ID upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [resRes, exchangesRes, wishRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/resources?ownerId=${user.id}`),
        axios.get('http://localhost:5000/api/transactions/my-exchanges'),
        axios.get('http://localhost:5000/api/resources/wishlist')
      ]);

      if (resRes.data.success) setMyResources(resRes.data.resources);
      if (exchangesRes.data.success) {
        setIncomingRequests(exchangesRes.data.incoming);
        setOutgoingRequests(exchangesRes.data.outgoing);
      }
      if (wishRes.data.success) setWishlist(wishRes.data.wishlist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleIdUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadingId(true);
    setUploadError(null);
    try {
      await uploadIdCard(uploadFile);
      alert('Verification ID uploaded successfully. Waiting for admin approval.');
      fetchDashboardData();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploadingId(false);
    }
  };

  const handleUpdateStatus = async (transactionId: string, status: 'Approved' | 'Rejected' | 'Completed') => {
    try {
      const res = await axios.put(`http://localhost:5000/api/transactions/${transactionId}/status`, { status });
      if (res.data.success) {
        const trans = res.data.transaction;
        // Emit Socket update to requester so they receive a real-time notification
        if (socket) {
          socket.emit('transaction_update', {
            userId: trans.requester,
            type: status === 'Approved' ? 'RequestAccepted' : 'System',
            title: status === 'Approved' ? 'Exchange Approved!' : 'Exchange Update',
            message: `Your request was ${status.toLowerCase()} for the book.`,
            link: '/dashboard'
          });
        }
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update request status.');
    }
  };

  const deleteListing = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this resource listing?')) return;
    try {
      const res = await axios.delete(`http://localhost:5000/api/resources/${id}`);
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeFromWishlist = async (id: string) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/resources/${id}/wishlist`);
      if (res.data.success) {
        setWishlist(prev => prev.filter(item => item._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold';
      case 'Rejected':
        return 'bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold';
      case 'Completed':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold';
      default:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Student Profile Info */}
        {user && (
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="glass-card p-6">
              <div className="flex flex-col items-center text-center">
                <img src={user.avatar} alt="Avatar" className="h-20 w-20 rounded-2xl bg-dark-950 object-cover shadow-md mb-4" />
                <h2 className="font-outfit text-lg font-extrabold text-white">{user.name}</h2>
                <span className="text-xs text-dark-400">{user.email}</span>
                
                {/* Verified Badge */}
                {user.isVerified ? (
                  <span className="inline-flex items-center gap-1.5 mt-3 text-xs text-accent-400 font-semibold uppercase tracking-wide bg-accent-500/10 px-3 py-1 rounded-full border border-accent-500/20">
                    <Award className="h-4 w-4" /> Verified Student
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 mt-3 text-xs text-amber-400 font-semibold uppercase tracking-wide bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    <ShieldAlert className="h-4 w-4" /> Unverified Account
                  </span>
                )}
              </div>

              {/* Department details */}
              <div className="h-[1px] bg-dark-850/80 my-5" />
              <div className="flex flex-col gap-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-dark-500 font-semibold">Department</span>
                  <span className="text-dark-200 font-bold max-w-[200px] truncate">{user.department || 'Not Filled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500 font-semibold">Semester Level</span>
                  <span className="text-dark-200 font-bold">{user.semester ? `Semester ${user.semester}` : 'Not Filled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500 font-semibold">Phone Number</span>
                  <span className="text-dark-200 font-bold">{user.phone || 'Not Filled'}</span>
                </div>
              </div>
            </div>

            {/* Profile Verification Card - Display if student is unverified and hasn't uploaded ID */}
            {!user.isVerified && !user.studentIdImage && (
              <div className="glass-card p-6">
                <h3 className="text-xs font-bold text-dark-550 uppercase tracking-wider mb-2.5">Upload Student ID</h3>
                <p className="text-[11px] text-dark-400 mb-4 leading-normal">
                  To verify your college affiliation, drag-and-drop or select a picture of your student ID card.
                </p>
                {uploadError && <div className="text-[11px] text-red-400 font-bold mb-3">{uploadError}</div>}
                <form onSubmit={handleIdUploadSubmit} className="flex flex-col gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
                    className="glass-input py-1.5 px-3 text-xs bg-dark-950"
                    required
                  />
                  <button type="submit" disabled={!uploadFile || uploadingId} className="glass-btn-primary py-2 text-xs">
                    {uploadingId ? 'Uploading ID...' : 'Submit Verification'}
                  </button>
                </form>
              </div>
            )}

            {/* Profile Verification status info card */}
            {!user.isVerified && user.studentIdImage && (
              <div className="glass-card p-6 bg-amber-500/5 border border-amber-500/10 text-xs flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Verification Pending Approval</span>
                  <p className="text-dark-450 mt-1 leading-normal">An administrator is reviewing your uploaded ID card. We will notify you once approved.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: Dashboard Navigation tabs */}
        <main className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex gap-4 border-b border-dark-850">
            <button
              onClick={() => setActiveTab('listings')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'listings' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-450 hover:text-dark-200'
              }`}
            >
              My Listings ({myResources.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'requests' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-450 hover:text-dark-200'
              }`}
            >
              My Trade Requests ({outgoingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'wishlist' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-450 hover:text-dark-200'
              }`}
            >
              My Wishlist ({wishlist.length})
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="flex flex-col gap-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-7 w-7 text-brand-400 animate-spin" />
              </div>
            ) : activeTab === 'listings' ? (
              /* MY LISTINGS TAB */
              myResources.length === 0 ? (
                <div className="text-center py-16 bg-dark-900/10 rounded-2xl border border-dashed border-dark-800">
                  <FileText className="h-8 w-8 text-dark-600 mx-auto mb-3" />
                  <h4 className="font-bold text-dark-200">No resources shared yet</h4>
                  <p className="text-xs text-dark-500 mt-0.5">Click 'Share a Resource' to list your textbook or notes.</p>
                  <Link to="/create-listing" className="glass-btn-primary py-2 px-5 text-xs mt-4 inline-block">Share Resource</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {myResources.map((res) => {
                    const matchRequests = incomingRequests.filter((req) => req.resource._id === res._id);
                    return (
                      <div key={res._id} className="glass-card overflow-hidden">
                        <div className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-dark-950/20">
                          <div className="flex gap-4">
                            <img src={getImageUrl(res.images[0])} alt="" className="h-14 w-11 object-cover bg-dark-950 rounded border border-dark-850" />
                            <div className="text-left">
                              <span className="badge-sky text-[9px] font-semibold px-2 py-0.5 rounded-full border">{res.resourceType}</span>
                              <h4 className="text-sm font-bold text-dark-100 mt-1 line-clamp-1">{res.title}</h4>
                              <p className="text-[10px] text-dark-450 mt-0.5">Course Code: {res.courseCode} | Sem {res.semester}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3.5 self-end sm:self-auto">
                            <span className={`text-xs px-2.5 py-1 rounded font-bold uppercase ${
                              res.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-500/10 text-brand-300'
                            }`}>
                              {res.status}
                            </span>
                            <button onClick={() => deleteListing(res._id)} className="text-xs text-red-400 hover:text-red-300 font-bold">
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Nest Requests for this book listing */}
                        {matchRequests.length > 0 && (
                          <div className="border-t border-dark-850 p-4 flex flex-col gap-3.5 bg-dark-950/40">
                            <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider block">Incoming Exchange Requests ({matchRequests.length})</span>
                            <div className="flex flex-col gap-3">
                              {matchRequests.map((req) => (
                                <div key={req._id} className="p-3 bg-dark-900 rounded-xl border border-dark-850 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                  <div className="flex items-center gap-2.5 text-left">
                                    <img src={req.requester.avatar} className="h-7 w-7 rounded bg-dark-950" alt="" />
                                    <div>
                                      <span className="text-xs font-bold text-dark-100">{req.requester.name}</span>
                                      <span className="text-[10px] text-dark-450 block">Dept: {req.requester.department} | Sem {req.requester.semester}</span>
                                    </div>
                                  </div>

                                  {/* Approve / Reject Controls */}
                                  <div className="flex items-center gap-2 self-end sm:self-auto">
                                    {req.status === 'Pending' ? (
                                      <>
                                        <button 
                                          onClick={() => handleUpdateStatus(req._id, 'Approved')}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3.5 rounded text-[10px] uppercase shadow"
                                        >
                                          Approve
                                        </button>
                                        <button 
                                          onClick={() => handleUpdateStatus(req._id, 'Rejected')}
                                          className="bg-dark-950 border border-dark-800 text-dark-400 hover:text-dark-100 font-bold py-1 px-3.5 rounded text-[10px] uppercase"
                                        >
                                          Decline
                                        </button>
                                      </>
                                    ) : (
                                      <span className={getStatusBadge(req.status)}>{req.status}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : activeTab === 'requests' ? (
              /* MY REQUESTS TAB (OUTGOING) */
              outgoingRequests.length === 0 ? (
                <div className="text-center py-16 bg-dark-900/10 rounded-2xl border border-dashed border-dark-800">
                  <Clock className="h-8 w-8 text-dark-600 mx-auto mb-3" />
                  <h4 className="font-bold text-dark-200">No outgoing requests</h4>
                  <p className="text-xs text-dark-500 mt-0.5">When you request to borrow/rent/buy resources, they will appear here.</p>
                  <Link to="/" className="glass-btn-primary py-2 px-5 text-xs mt-4 inline-block">Browse Catalog</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {outgoingRequests.map((req) => (
                    <div key={req._id} className="glass-card p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 text-left">
                      <div className="flex gap-4">
                        <img src={getImageUrl(req.resource.images[0])} alt="" className="h-14 w-11 object-cover bg-dark-950 rounded border border-dark-850" />
                        <div>
                          <span className="badge-sky text-[9px] font-semibold px-2 py-0.5 rounded-full border">{req.resource.resourceType}</span>
                          <h4 className="text-sm font-bold text-dark-100 mt-1 line-clamp-1">{req.resource.title}</h4>
                          <p className="text-[10px] text-dark-450 mt-0.5">Owner: {req.owner.name} | Mode: {req.exchangeType}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 md:items-end">
                        <span className={getStatusBadge(req.status)}>{req.status}</span>
                        {/* Display unlocked details if request is approved */}
                        {req.status === 'Approved' && (
                          <div className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-[11px] text-emerald-400 mt-1">
                            <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {req.owner.email}</div>
                            {req.owner.phone && (
                              <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {req.owner.phone}</div>
                            )}
                            <button
                              onClick={() => navigate(`/chat?partnerId=${req.owner._id}&resourceId=${req.resource._id}`)}
                              className="text-[10px] uppercase font-bold text-center bg-emerald-600 text-white rounded py-1 mt-1 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <MessageSquare className="h-3 w-3" /> Initiate Chat
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* WISHLIST TAB */
              wishlist.length === 0 ? (
                <div className="text-center py-16 bg-dark-900/10 rounded-2xl border border-dashed border-dark-800">
                  <Heart className="h-8 w-8 text-dark-600 mx-auto mb-3" />
                  <h4 className="font-bold text-dark-200">Wishlist is empty</h4>
                  <p className="text-xs text-dark-500 mt-0.5">Bookmark resource cards to keep track of books you need.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {wishlist.map((item) => (
                    <div key={item._id} className="relative group">
                      {/* Trash/delete wishlist icon */}
                      <button
                        onClick={() => removeFromWishlist(item._id)}
                        className="absolute top-2 right-2 bg-dark-900/90 hover:bg-red-500 text-dark-400 hover:text-white p-2 rounded-xl border border-dark-800 z-10 hover:scale-105 transition-all"
                        title="Remove from Wishlist"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                      <BookCard resource={item} />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

// Reusable SVG XCircleIcon helper
const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
