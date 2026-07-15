import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { BookCard } from '../components/BookCard';
import { getImageUrl } from '../utils/image';
import {
  Heart, Clock, ShieldAlert, Award, FileText, MessageSquare, Mail, Phone, Plus, Star, Edit3
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, uploadIdCard } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'listings' | 'requests' | 'wishlist' | 'receivedExchanges' | 'sentExchanges'>('listings');
  const [loading, setLoading] = useState(true);

  // Data states
  const [myResources, setMyResources] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [incomingExchanges, setIncomingExchanges] = useState<any[]>([]);
  const [outgoingExchanges, setOutgoingExchanges] = useState<any[]>([]);

  // Local ID upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Review Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [activeIdForReview, setActiveIdForReview] = useState<string | null>(null);
  const [activeTypeForReview, setActiveTypeForReview] = useState<'Transaction' | 'ExchangeRequest' | null>(null);
  const [isEditReview, setIsEditReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const handleOpenReviewModal = async (id: string, type: 'Transaction' | 'ExchangeRequest', targetUserId: string, isEdit: boolean) => {
    console.log('Opening review modal for target user:', targetUserId);
    setActiveIdForReview(id);
    setActiveTypeForReview(type);
    setIsEditReview(isEdit);
    setReviewError(null);
    setReviewComment('');
    setReviewRating(5);
    setEditingReviewId(null);

    if (isEdit) {
      try {
        const urlType = type === 'Transaction' ? 'transaction' : 'exchange-request';
        const res = await axios.get(`http://localhost:5000/api/reviews/${urlType}/${id}`);
        if (res.data.success) {
          setReviewRating(res.data.review.rating);
          setReviewComment(res.data.review.comment);
          setEditingReviewId(res.data.review._id);
        }
      } catch (err: any) {
        console.error('Error loading review:', err);
        setReviewError('Failed to load existing review');
      }
    }
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewError(null);
    try {
      let res;
      if (isEditReview && editingReviewId) {
        res = await axios.put(`http://localhost:5000/api/reviews/${editingReviewId}`, {
          rating: reviewRating,
          comment: reviewComment
        });
      } else {
        const payload = activeTypeForReview === 'Transaction'
          ? { transactionId: activeIdForReview, rating: reviewRating, comment: reviewComment }
          : { exchangeRequestId: activeIdForReview, rating: reviewRating, comment: reviewComment };
        res = await axios.post('http://localhost:5000/api/reviews', payload);
      }

      if (res.data.success) {
        setShowReviewModal(false);
        fetchDashboardData();
      }
    } catch (err: any) {
      setReviewError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [resRes, exchangesRes, wishRes, exchangeReqsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/resources?ownerId=${user.id}`),
        axios.get('http://localhost:5000/api/transactions/my-exchanges'),
        axios.get('http://localhost:5000/api/resources/wishlist'),
        axios.get('http://localhost:5000/api/exchange-requests/my-requests')
      ]);

      if (resRes.data.success) setMyResources(resRes.data.resources);
      if (exchangesRes.data.success) {
        setIncomingRequests(exchangesRes.data.incoming);
        setOutgoingRequests(exchangesRes.data.outgoing);
      }
      if (wishRes.data.success) setWishlist(wishRes.data.wishlist);
      if (exchangeReqsRes.data.success) {
        setIncomingExchanges(exchangeReqsRes.data.incoming);
        setOutgoingExchanges(exchangeReqsRes.data.outgoing);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptExchange = async (req: any) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/exchange-requests/${req._id}/accept`);
      if (res.data.success) {
        alert('Exchange request accepted successfully!');
        navigate(`/chat?partnerId=${req.requester._id}&resourceId=${req.requestedBook._id}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept exchange request.');
    }
  };

  const handleRejectExchange = async (id: string) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/exchange-requests/${id}/reject`);
      if (res.data.success) {
        alert('Exchange request rejected.');
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject exchange request.');
    }
  };

  const handleCancelExchange = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this exchange request?')) return;
    try {
      const res = await axios.put(`http://localhost:5000/api/exchange-requests/${id}/cancel`);
      if (res.data.success) {
        alert('Exchange request cancelled.');
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel exchange request.');
    }
  };

  const handleCompleteExchange = async (id: string) => {
    if (!window.confirm('Are you sure the books have been physically exchanged and you want to complete the transaction? This will remove both books from the marketplace.')) return;
    try {
      const res = await axios.put(`http://localhost:5000/api/exchange-requests/${id}/complete`);
      if (res.data.success) {
        alert('Exchange completed successfully!');
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete exchange.');
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
      case 'Accepted':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold';
      case 'Rejected':
      case 'Cancelled':
        return 'bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold';
      case 'Completed':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold';
      default:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-left animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: Student Profile Info */}
        {user && (
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="glass-card p-6 border-white/[0.05] bg-dark-900/10">
              <div className="flex flex-col items-center text-center">
                <img src={user.avatar} alt="Avatar" className="h-20 w-20 rounded-2xl bg-dark-950 object-cover shadow-lg border border-white/[0.08] mb-4" />
                <h2 className="font-outfit text-base font-extrabold text-white">{user.name}</h2>
                <span className="text-xs text-dark-400 mt-0.5">{user.email}</span>

                {/* Verified Badge */}
                {user.isVerified ? (
                  <span className="inline-flex items-center gap-1.5 mt-4 text-[9px] text-accent-400 font-bold uppercase tracking-wider bg-accent-500/10 px-3 py-1 rounded-full border border-accent-500/20 shadow-glow-emerald">
                    <Award className="h-3.5 w-3.5" /> Verified Student
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 mt-4 text-[9px] text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 shadow-glow-amber animate-pulse">
                    <ShieldAlert className="h-3.5 w-3.5" /> Unverified Account
                  </span>
                )}
              </div>

              {/* Department details */}
              <div className="h-[1px] bg-white/[0.06] my-5" />
              <div className="flex flex-col gap-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-dark-450 font-semibold uppercase tracking-wider text-[9px]">Department</span>
                  <span className="text-dark-200 font-bold max-w-[180px] truncate" title={user.department}>{user.department || 'Not Filled'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-dark-450 font-semibold uppercase tracking-wider text-[9px]">Semester Level</span>
                  <span className="text-dark-200 font-bold">{user.semester ? `Semester ${user.semester}` : 'Not Filled'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-dark-450 font-semibold uppercase tracking-wider text-[9px]">Phone Number</span>
                  <span className="text-dark-200 font-bold">{user.phone || 'Not Filled'}</span>
                </div>
              </div>
            </div>

            {/* Profile Verification Card - Display if student is unverified and hasn't uploaded ID */}
            {!user.isVerified && !user.studentIdImage && (
              <div className="glass-card p-6 border-white/[0.05] bg-dark-900/10">
                <h3 className="text-[10px] font-bold text-dark-350 uppercase tracking-widest mb-2.5">Upload Student ID</h3>
                <p className="text-[11px] text-dark-400 mb-4 leading-relaxed font-medium">
                  To verify your college affiliation, drag-and-drop or select a picture of your student ID card.
                </p>
                {uploadError && <div className="text-[11px] text-red-400 font-bold mb-3">{uploadError}</div>}
                <form onSubmit={handleIdUploadSubmit} className="flex flex-col gap-3.5">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
                    className="glass-input py-2 px-3 text-xs bg-dark-950/40 border-white/[0.08]"
                    required
                  />
                  <button type="submit" disabled={!uploadFile || uploadingId} className="glass-btn-primary py-2.5 text-xs font-bold uppercase tracking-wider mt-1.5 shadow-glow-indigo">
                    {uploadingId ? 'Uploading ID...' : 'Submit Verification'}
                  </button>
                </form>
              </div>
            )}

            {/* Profile Verification status info card */}
            {!user.isVerified && user.studentIdImage && (
              <div className="glass-card p-5 bg-amber-500/5 border border-amber-500/15 shadow-glow-amber text-xs flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase tracking-wider text-[10px] text-amber-300">Verification Pending</span>
                  <p className="text-dark-300 mt-1 leading-relaxed font-medium">An administrator is reviewing your uploaded ID card. We will notify you once approved.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: Dashboard Navigation tabs */}
        <main className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex gap-2.5 border-b border-white/[0.06] overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('listings')}
              className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'listings' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-450 hover:text-dark-200'
                }`}
            >
              My Listings ({myResources.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'requests' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-450 hover:text-dark-200'
                }`}
            >
              My Trade Requests ({outgoingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('receivedExchanges')}
              className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'receivedExchanges' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-450 hover:text-dark-200'
                }`}
            >
              Received Exchanges ({incomingExchanges.length})
            </button>
            <button
              onClick={() => setActiveTab('sentExchanges')}
              className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'sentExchanges' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-450 hover:text-dark-200'
                }`}
            >
              My Exchanges ({outgoingExchanges.length})
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'wishlist' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-450 hover:text-dark-200'
                }`}
            >
              My Wishlist ({wishlist.length})
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="flex flex-col gap-6 animate-fade-in">
            {loading ? (
              <div className="flex flex-col gap-6 animate-pulse">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="glass-card p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/[0.01] border border-white/[0.05] rounded-2xl">
                    <div className="flex gap-4 items-center">
                      <div className="h-14 w-11 bg-white/[0.02] rounded shrink-0" />
                      <div className="flex flex-col gap-2.5 text-left">
                        <div className="h-3 bg-white/[0.02] rounded w-16" />
                        <div className="h-4 bg-white/[0.02] rounded w-48" />
                        <div className="h-3 bg-white/[0.02] rounded w-32" />
                      </div>
                    </div>
                    <div className="h-6 bg-white/[0.02] rounded w-20 self-end sm:self-auto" />
                  </div>
                ))}
              </div>
            ) : activeTab === 'listings' ? (
              /* MY LISTINGS TAB */
              myResources.length === 0 ? (
                <div className="text-center py-20 bg-dark-900/10 rounded-2xl border border-dashed border-white/[0.05]">
                  <FileText className="h-8 w-8 text-dark-500 mx-auto mb-3.5" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-dark-200">No resources shared yet</h4>
                  <p className="text-xs text-dark-500 mt-1.5 max-w-sm mx-auto leading-relaxed">Click 'Share a Resource' to list your reference books or academic notes in the campus hub.</p>
                  <Link to="/create-listing" className="glass-btn-primary py-2 px-5 text-[10px] font-bold uppercase tracking-wider mt-5 inline-block">Share Resource</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-fade-in">
                  {/* Share Resource CTA */}
                  <div className="glass-card p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border border-brand-500/20 bg-brand-500/5 shadow-glow-indigo">
                    <div className="text-left max-w-lg">
                      <h4 className="text-sm font-extrabold text-white">Share another Academic Resource</h4>
                      <p className="text-xs text-dark-350 mt-1 leading-relaxed font-medium">Have more textbooks, reference material, lab records, or exam prep guides? List them now to help others.</p>
                    </div>
                    <Link to="/create-listing" className="glass-btn-primary py-2 px-5 text-[10px] font-bold uppercase tracking-wider shrink-0 self-start sm:self-auto flex items-center gap-1.5 shadow-none">
                      <Plus className="h-3.5 w-3.5" /> Share Resource
                    </Link>
                  </div>

                  {myResources.map((res) => {
                    const matchRequests = incomingRequests.filter((req) => req.resource?._id === res._id);
                    return (
                      <div key={res._id} className="glass-card overflow-hidden border-white/[0.05] bg-dark-900/10 rounded-2xl">
                        <div className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/[0.01]">
                          <div className="flex gap-4">
                            <img src={getImageUrl(res.images[0])} alt="" className="h-14 w-11 object-cover bg-dark-950 rounded border border-white/[0.06]" />
                            <div className="text-left flex flex-col justify-between">
                              <div>
                                <span className="badge-sky text-[8px] px-2 py-0.5 rounded-full border border-sky-500/25">{res.resourceType}</span>
                                <h4 className="text-sm font-extrabold text-white mt-1.5 line-clamp-1">{res.title}</h4>
                              </div>
                              <p className="text-[10px] text-dark-450 font-bold uppercase tracking-wider mt-1">Course Code: {res.courseCode} | Sem {res.semester}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-auto">
                            <span className={`text-[10px] px-3 py-1 rounded-xl font-extrabold uppercase tracking-wider ${res.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-brand-500/10 text-brand-350 border border-brand-500/20'
                              }`}>
                              {res.status}
                            </span>
                            <button onClick={() => deleteListing(res._id)} className="text-[10px] text-red-400 hover:text-red-300 font-extrabold uppercase tracking-wider">
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Nest Requests for this book listing */}
                        {matchRequests.length > 0 && (
                          <div className="border-t border-white/[0.04] p-5 flex flex-col gap-4 bg-dark-950/20">
                            <span className="text-[9px] text-dark-500 font-bold uppercase tracking-widest block">Incoming Exchange Requests ({matchRequests.length})</span>
                            <div className="flex flex-col gap-3">
                              {matchRequests.map((req) => (
                                <div key={req._id} className="p-4 bg-dark-900/60 rounded-2xl border border-white/[0.05] flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                  <div className="flex items-center gap-3 text-left">
                                    <img src={req.requester.avatar} className="h-8 w-8 rounded-lg bg-dark-950 border border-white/[0.06] object-cover" alt="" />
                                    <div>
                                      <span className="text-xs font-extrabold text-dark-100 block">{req.requester.name}</span>
                                      <span className="text-[9px] text-dark-450 font-bold uppercase tracking-wider mt-0.5 block">Dept: {req.requester.department} | Sem {req.requester.semester}</span>
                                    </div>
                                  </div>

                                  {/* Approve / Reject Controls */}
                                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                                    {req.status === 'Pending' ? (
                                      <>
                                        <button
                                          onClick={() => handleUpdateStatus(req._id, 'Approved')}
                                          className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-1.5 px-4 rounded-xl text-[10px] uppercase shadow-md shadow-emerald-600/10 transition-all duration-200"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleUpdateStatus(req._id, 'Rejected')}
                                          className="bg-white/[0.02] border border-white/[0.08] text-dark-350 hover:text-white font-bold py-1.5 px-4 rounded-xl text-[10px] uppercase transition-all duration-200"
                                        >
                                          Decline
                                        </button>
                                      </>
                                    ) : (
                                      <div className="flex flex-col items-end gap-1.5">
                                        <span className={getStatusBadge(req.status)}>{req.status}</span>
                                        {req.status === 'Completed' && (
                                          <div className="mt-1">
                                            {!req.isReviewedByOwner ? (
                                              <button
                                                onClick={() => handleOpenReviewModal(req._id, 'Transaction', req.requester._id, false)}
                                                className="glass-btn-primary py-1 px-2.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-none"
                                              >
                                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Leave Review
                                              </button>
                                            ) : (
                                              <button
                                                onClick={() => handleOpenReviewModal(req._id, 'Transaction', req.requester._id, true)}
                                                className="glass-btn-secondary py-1 px-2.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                                              >
                                                <Edit3 className="h-3 w-3 text-brand-400" /> Edit Review
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
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
                <div className="text-center py-20 bg-dark-900/10 rounded-2xl border border-dashed border-white/[0.05]">
                  <Clock className="h-8 w-8 text-dark-500 mx-auto mb-3.5" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-dark-200">No outgoing requests</h4>
                  <p className="text-xs text-dark-500 mt-1.5 max-w-sm mx-auto leading-relaxed">When you request to borrow/rent/buy resources, they will appear here to coordinate trade details.</p>
                  <Link to="/" className="glass-btn-primary py-2 px-5 text-[10px] font-bold uppercase tracking-wider mt-5 inline-block">Browse Catalog</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4 animate-fade-in">
                  {outgoingRequests.map((req) => (
                    <div key={req._id} className="glass-card p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 border border-white/[0.05] bg-dark-900/10 rounded-2xl text-left">
                      <div className="flex gap-4">
                        <img src={getImageUrl(req.resource?.images?.[0])} alt="" className="h-14 w-11 object-cover bg-dark-950 rounded border border-white/[0.06]" />
                        <div className="flex flex-col justify-between py-0.5">
                          <div>
                            <span className="badge-sky text-[8px] px-2 py-0.5 rounded-full border border-sky-500/25">{req.resource?.resourceType || 'Resource'}</span>
                            <h4 className="text-sm font-extrabold text-white mt-1.5 line-clamp-1">{req.resource?.title || 'Deleted Resource'}</h4>
                          </div>
                          <p className="text-[10px] text-dark-450 font-bold uppercase tracking-wider mt-1">Owner: {req.owner?.name || 'Unknown User'} | Mode: {req.exchangeType}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 md:items-end">
                        <span className={getStatusBadge(req.status)}>{req.status}</span>
                        {/* Display unlocked details if request is approved */}
                        {req.status === 'Approved' && req.owner && req.resource && (
                          <div className="flex flex-col gap-2 p-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 text-xs text-emerald-400 mt-2 shadow-glow-emerald">
                            <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-emerald-500" /> <span className="font-semibold">{req.owner.email}</span></div>
                            {req.owner.phone && (
                              <div className="flex items-center gap-1.5 mt-0.5"><Phone className="h-3.5 w-3.5 text-emerald-500" /> <span className="font-semibold">{req.owner.phone}</span></div>
                            )}
                            <button
                              onClick={() => navigate(`/chat?partnerId=${req.owner._id}&resourceId=${req.resource._id}`)}
                              className="text-[9px] uppercase font-bold text-center bg-emerald-600 text-white rounded-xl py-1.5 mt-2 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/15"
                            >
                              <MessageSquare className="h-3.5 w-3.5" /> Initiate Chat
                            </button>
                          </div>
                        )}
                        {req.status === 'Completed' && req.owner && (
                          <div className="mt-1">
                            {!req.isReviewedByRequester ? (
                              <button
                                onClick={() => handleOpenReviewModal(req._id, 'Transaction', req.owner._id, false)}
                                className="glass-btn-primary py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-none"
                              >
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Leave Review
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenReviewModal(req._id, 'Transaction', req.owner._id, true)}
                                className="glass-btn-secondary py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-brand-400" /> Edit Review
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : activeTab === 'receivedExchanges' ? (
              /* RECEIVED EXCHANGE REQUESTS TAB */
              incomingExchanges.length === 0 ? (
                <div className="text-center py-16 bg-dark-900/10 rounded-2xl border border-dashed border-dark-800">
                  <Clock className="h-8 w-8 text-dark-600 mx-auto mb-3" />
                  <h4 className="font-bold text-dark-200">No received exchange requests</h4>
                  <p className="text-xs text-dark-500 mt-0.5">When other users offer to exchange books with your listings, they will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {incomingExchanges.map((req) => (
                    <div key={req._id} className="glass-card p-5 flex flex-col gap-4 text-left">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dark-850 pb-3">
                        <div className="flex items-center gap-3">
                          <img src={req.requester?.avatar} className="h-9 w-9 rounded-full bg-dark-900 object-cover" alt="" />
                          <div>
                            <span className="text-sm font-bold text-dark-100">{req.requester?.name || 'Unknown User'}</span>
                            <span className="text-[10px] text-dark-450 block">Dept: {req.requester?.department || 'N/A'} | Sem {req.requester?.semester || 'N/A'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-dark-500 font-semibold">{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-dark-950/20 border border-dark-900">
                          <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Your Book (Requested)</span>
                          <div className="flex gap-3">
                            <img src={getImageUrl(req.requestedBook?.images?.[0])} alt="" className="h-12 w-9 object-cover rounded bg-dark-950 border border-dark-850" />
                            <div>
                              <h5 className="text-xs font-bold text-white line-clamp-1">{req.requestedBook?.title || 'Deleted Book'}</h5>
                              <p className="text-[10px] text-dark-450 mt-0.5">Course: {req.requestedBook?.courseCode || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-dark-950/20 border border-dark-900">
                          <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">Their Offered Book</span>
                          <div className="flex gap-3 justify-between items-center">
                            <div className="flex gap-3">
                              <img src={getImageUrl(req.offeredBook?.images?.[0])} alt="" className="h-12 w-9 object-cover rounded bg-dark-950 border border-dark-850" />
                              <div>
                                <h5 className="text-xs font-bold text-white line-clamp-1">{req.offeredBook?.title || 'Deleted Book'}</h5>
                                <p className="text-[10px] text-dark-450 mt-0.5">Course: {req.offeredBook?.courseCode || 'N/A'}</p>
                              </div>
                            </div>
                            {req.offeredBook && (
                              <a 
                                href={`/resources/${req.offeredBook._id}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] uppercase font-bold bg-dark-950 border border-dark-800 text-dark-300 hover:text-white px-2 py-1 rounded transition-colors"
                              >
                                View Offered Book
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {req.message && (
                        <div className="p-3 bg-dark-950/40 rounded-xl border border-dark-900 text-xs italic text-dark-400">
                          "{req.message}"
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        <span className={getStatusBadge(req.status)}>{req.status}</span>
                        <div className="flex gap-2 items-center">
                          {req.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleAcceptExchange(req)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded text-xs uppercase shadow transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRejectExchange(req._id)}
                                className="bg-dark-950 border border-dark-800 text-dark-400 hover:text-dark-100 font-bold py-1.5 px-4 rounded text-xs uppercase transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {req.status === 'Accepted' && req.requester && req.requestedBook && (
                            <>
                              <div className="flex flex-col gap-1 text-[11px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 p-2 rounded-xl">
                                <div>Email: {req.requester.email}</div>
                                {req.requester.phone && <div>Phone: {req.requester.phone}</div>}
                                <button
                                  onClick={() => navigate(`/chat?partnerId=${req.requester._id}&resourceId=${req.requestedBook._id}`)}
                                  className="text-[10px] uppercase font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded py-1 px-2 mt-1 transition-colors flex items-center justify-center gap-1"
                                >
                                  Chat with Buyer
                                </button>
                              </div>
                              <button
                                onClick={() => handleCompleteExchange(req._id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded text-xs uppercase shadow transition-colors ml-2"
                              >
                                Complete Exchange
                              </button>
                            </>
                          )}
                          {req.status === 'Completed' && req.requester && (
                            <div>
                              {!req.isReviewedByReceiver ? (
                                <button
                                  onClick={() => handleOpenReviewModal(req._id, 'ExchangeRequest', req.requester._id, false)}
                                  className="glass-btn-primary py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-none"
                                >
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Leave Review
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenReviewModal(req._id, 'ExchangeRequest', req.requester._id, true)}
                                  className="glass-btn-secondary py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-brand-400" /> Edit Review
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : activeTab === 'sentExchanges' ? (
              /* SENT EXCHANGE REQUESTS TAB */
              outgoingExchanges.length === 0 ? (
                <div className="text-center py-16 bg-dark-900/10 rounded-2xl border border-dashed border-dark-800">
                  <Clock className="h-8 w-8 text-dark-600 mx-auto mb-3" />
                  <h4 className="font-bold text-dark-200">No sent exchange requests</h4>
                  <p className="text-xs text-dark-500 mt-0.5">When you request to trade books with other users, they will appear here.</p>
                  <Link to="/" className="glass-btn-primary py-2 px-5 text-xs mt-4 inline-block">Browse Catalog</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {outgoingExchanges.map((req) => (
                    <div key={req._id} className="glass-card p-5 flex flex-col gap-4 text-left">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dark-850 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-dark-450">Seller Name:</span>
                          <span className="text-xs font-bold text-white">{req.receiver?.name || 'Unknown User'}</span>
                          <span className="text-[10px] text-dark-450">({req.receiver?.department || 'N/A'})</span>
                        </div>
                        <span className="text-[10px] text-dark-500 font-semibold">{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-dark-950/20 border border-dark-900">
                          <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Requested Book</span>
                          <div className="flex gap-3 justify-between items-center">
                            <div className="flex gap-3">
                              <img src={getImageUrl(req.requestedBook?.images?.[0])} alt="" className="h-12 w-9 object-cover rounded bg-dark-950 border border-dark-850" />
                              <div>
                                <h5 className="text-xs font-bold text-white line-clamp-1">{req.requestedBook?.title || 'Deleted Book'}</h5>
                                <p className="text-[10px] text-dark-450 mt-0.5">Course: {req.requestedBook?.courseCode || 'N/A'}</p>
                              </div>
                            </div>
                            {req.requestedBook && (
                              <a 
                                href={`/resources/${req.requestedBook._id}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] uppercase font-bold bg-dark-950 border border-dark-800 text-dark-300 hover:text-white px-2 py-1 rounded transition-colors"
                              >
                                View Requested Book
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-dark-950/20 border border-dark-900">
                          <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">Your Offered Book</span>
                          <div className="flex gap-3">
                            <img src={getImageUrl(req.offeredBook?.images?.[0])} alt="" className="h-12 w-9 object-cover rounded bg-dark-950 border border-dark-850" />
                            <div>
                              <h5 className="text-xs font-bold text-white line-clamp-1">{req.offeredBook?.title || 'Deleted Book'}</h5>
                              <p className="text-[10px] text-dark-450 mt-0.5">Course: {req.offeredBook?.courseCode || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {req.message && (
                        <div className="p-3 bg-dark-950/40 rounded-xl border border-dark-900 text-xs italic text-dark-400">
                          "{req.message}"
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        <span className={getStatusBadge(req.status)}>{req.status}</span>
                        <div className="flex gap-2 items-center">
                          {req.status === 'Pending' && (
                            <button
                              onClick={() => handleCancelExchange(req._id)}
                              className="bg-red-950 border border-red-800 hover:bg-red-700 hover:text-white text-red-400 font-bold py-1.5 px-4 rounded text-xs uppercase transition-all"
                            >
                              Cancel Request
                            </button>
                          )}
                          {req.status === 'Accepted' && req.receiver && req.requestedBook && (
                            <>
                              <div className="flex flex-col gap-1 text-[11px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 p-2 rounded-xl">
                                <div>Email: {req.receiver.email}</div>
                                {req.receiver.phone && <div>Phone: {req.receiver.phone}</div>}
                                <button
                                  onClick={() => navigate(`/chat?partnerId=${req.receiver._id}&resourceId=${req.requestedBook._id}`)}
                                  className="text-[10px] uppercase font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded py-1 px-2 mt-1 transition-colors flex items-center justify-center gap-1"
                                >
                                  Chat with Seller
                                </button>
                              </div>
                              <button
                                onClick={() => handleCompleteExchange(req._id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded text-xs uppercase shadow transition-colors ml-2"
                              >
                                Complete Exchange
                              </button>
                            </>
                          )}
                          {req.status === 'Completed' && req.receiver && (
                            <div>
                              {!req.isReviewedByRequester ? (
                                <button
                                  onClick={() => handleOpenReviewModal(req._id, 'ExchangeRequest', req.receiver._id, false)}
                                  className="glass-btn-primary py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-none"
                                >
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Leave Review
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenReviewModal(req._id, 'ExchangeRequest', req.receiver._id, true)}
                                  className="glass-btn-secondary py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-brand-400" /> Edit Review
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* WISHLIST TAB */
              wishlist.length === 0 ? (
                <div className="text-center py-20 bg-dark-900/10 rounded-2xl border border-dashed border-white/[0.05]">
                  <Heart className="h-8 w-8 text-dark-500 mx-auto mb-3.5 animate-pulse" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-dark-200">Wishlist is empty</h4>
                  <p className="text-xs text-dark-500 mt-1.5 max-w-sm mx-auto leading-relaxed">Bookmark resource cards in the main catalog to keep track of academic books or documents you need.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
                  {wishlist.map((item) => (
                    <div key={item._id} className="relative group">
                      {/* Trash/delete wishlist icon */}
                      <button
                        onClick={() => removeFromWishlist(item._id)}
                        className="absolute top-3 right-3 bg-dark-900/90 hover:bg-red-650 hover:border-red-500 text-dark-400 hover:text-white p-2 rounded-xl border border-white/[0.08] z-10 hover:scale-105 transition-all shadow-lg"
                        title="Remove from Wishlist"
                      >
                        <XCircleIcon className="h-4.5 w-4.5" />
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

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/85 backdrop-blur-md p-4">
          <div className="glass-card max-w-md w-full p-6 border-white/[0.08] bg-dark-900/90 shadow-2xl relative text-left">
            <h3 className="font-outfit text-md font-bold text-white border-b border-white/[0.06] pb-3">
              {isEditReview ? 'Edit Your Review' : 'Review Exchange'}
            </h3>
            {reviewError && (
              <div className="my-3 text-xs text-red-400 font-semibold">{reviewError}</div>
            )}
            <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-dark-450 uppercase tracking-widest">Rate User</label>
                <div className="flex gap-1.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="text-amber-400 hover:scale-110 transition-transform duration-100"
                    >
                      <Star className={`h-6.5 w-6.5 ${reviewRating >= star ? 'fill-amber-400' : 'text-dark-600'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-dark-450 uppercase tracking-widest">Your review comment</label>
                <textarea
                  placeholder="Describe book quality, coordination, speed of delivery..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="glass-input text-xs h-28 resize-none py-2 border-white/[0.08]"
                  required
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="glass-btn-primary flex-grow py-3 text-xs font-bold uppercase tracking-wider"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="glass-btn-secondary py-3 px-5 text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable SVG XCircleIcon helper
const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
