import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Star, Award, ThumbsUp, ThumbsDown, MessageSquare, MoreVertical,
  Trash2, Edit3, AlertTriangle, Send, ChevronDown, ChevronUp,
  RefreshCw, BookOpen, Clock, ShieldCheck, CheckCircle
} from 'lucide-react';
import { BookCard } from '../components/BookCard';

export const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');

  // Listings state
  const [listings, setListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [reviewCount, setReviewCount] = useState(0);

  // Eligibility state
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<any>(null);

  // Create/Edit review modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Comment section states (grouped by reviewId)
  const [openComments, setOpenComments] = useState<{ [reviewId: string]: boolean }>({});
  const [commentsData, setCommentsData] = useState<{ [reviewId: string]: any[] }>({});
  const [loadingComments, setLoadingComments] = useState<{ [reviewId: string]: boolean }>({});
  const [commentsInputs, setCommentsInputs] = useState<{ [reviewId: string]: string }>({});
  const [replyingToComment, setReplyingToComment] = useState<{ [reviewId: string]: { id: string; name: string } | null }>({});

  // Lazy replies states (grouped by commentId)
  const [openReplies, setOpenReplies] = useState<{ [commentId: string]: boolean }>({});
  const [repliesData, setRepliesData] = useState<{ [commentId: string]: any[] }>({});
  const [loadingReplies, setLoadingReplies] = useState<{ [commentId: string]: boolean }>({});

  // Report modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<'Spam' | 'Harassment' | 'Fake Review' | 'Other'>('Spam');
  const [reportComment, setReportComment] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Open review action dropdowns (e.g. edit/delete/report menu)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchProfileUser = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/auth/user/${userId}`);
      if (res.data.success) {
        setProfileUser(res.data.user);
      }
    } catch (err) {
      console.error('Error fetching profile user:', err);
    }
  };

  const fetchListings = async () => {
    setLoadingListings(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/resources?ownerId=${userId}`);
      if (res.data.success) {
        const active = res.data.resources.filter((b: any) => b.status === 'Available');
        setListings(active);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingListings(false);
    }
  };

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/reviews/user/${userId}?sortBy=${sortBy}`);
      if (res.data.success) {
        setReviews(res.data.reviews);
        setReviewCount(res.data.reviewCount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchEligibility = async () => {
    if (!currentUser || currentUser.id === userId) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/reviews/check-eligibility/${userId}`);
      if (res.data.success) {
        setIsEligible(res.data.eligible);
        setEligibilityData(res.data.eligible ? res.data : null);
      }
    } catch (err) {
      console.error('Error checking eligibility:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchProfileUser(),
      fetchListings(),
      fetchReviews(),
      fetchEligibility()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  useEffect(() => {
    if (!loading) {
      fetchReviews();
    }
  }, [sortBy]);

  // Review Submissions
  const handleOpenLeaveReview = () => {
    setEditingReviewId(null);
    setReviewRating(5);
    setReviewComment('');
    setReviewError(null);
    setShowReviewModal(true);
  };

  const handleOpenEditReview = (rev: any) => {
    setEditingReviewId(rev._id);
    setReviewRating(rev.rating);
    setReviewComment(rev.comment);
    setReviewError(null);
    setShowReviewModal(true);
    setActiveMenuId(null);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewError(null);
    try {
      let res;
      if (editingReviewId) {
        res = await axios.put(`http://localhost:5000/api/reviews/${editingReviewId}`, {
          rating: reviewRating,
          comment: reviewComment
        });
      } else {
        res = await axios.post('http://localhost:5000/api/reviews', {
          transactionId: eligibilityData?.transactionId || undefined,
          exchangeRequestId: eligibilityData?.exchangeRequestId || undefined,
          rating: reviewRating,
          comment: reviewComment
        });
      }

      if (res.data.success) {
        setShowReviewModal(false);
        setReviewComment('');
        await Promise.all([fetchReviews(), fetchEligibility(), fetchProfileUser()]);
      }
    } catch (err: any) {
      setReviewError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      const res = await axios.delete(`http://localhost:5000/api/reviews/${reviewId}`);
      if (res.data.success) {
        await Promise.all([fetchReviews(), fetchEligibility(), fetchProfileUser()]);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete review');
    }
  };

  // Review Likes & Dislikes
  const handleLikeReview = async (reviewId: string) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/reviews/${reviewId}/like`);
      if (res.data.success) {
        setReviews(prev =>
          prev.map(r => (r._id === reviewId ? { ...r, likes: res.data.likes, dislikes: res.data.dislikes } : r))
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to like review');
    }
  };

  const handleDislikeReview = async (reviewId: string) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/reviews/${reviewId}/dislike`);
      if (res.data.success) {
        setReviews(prev =>
          prev.map(r => (r._id === reviewId ? { ...r, likes: res.data.likes, dislikes: res.data.dislikes } : r))
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dislike review');
    }
  };

  // Comments System
  const toggleCommentsSection = async (reviewId: string) => {
    const isCurrentlyOpen = !!openComments[reviewId];
    setOpenComments(prev => ({ ...prev, [reviewId]: !isCurrentlyOpen }));

    if (!isCurrentlyOpen && !commentsData[reviewId]) {
      setLoadingComments(prev => ({ ...prev, [reviewId]: true }));
      try {
        const res = await axios.get(`http://localhost:5000/api/reviews/${reviewId}/comments`);
        if (res.data.success) {
          setCommentsData(prev => ({ ...prev, [reviewId]: res.data.comments }));
        }
      } catch (err) {
        console.error('Error fetching comments:', err);
      } finally {
        setLoadingComments(prev => ({ ...prev, [reviewId]: false }));
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, reviewId: string) => {
    e.preventDefault();
    const commentText = commentsInputs[reviewId] || '';
    if (!commentText.trim()) return;

    const replyTarget = replyingToComment[reviewId];

    try {
      const res = await axios.post(`http://localhost:5000/api/reviews/${reviewId}/comments`, {
        text: commentText,
        parentCommentId: replyTarget?.id || undefined
      });

      if (res.data.success) {
        const newComment = res.data.comment;

        // If it is a threaded reply, append it to replies list of the parent
        if (replyTarget) {
          setRepliesData(prev => ({
            ...prev,
            [replyTarget.id]: [...(prev[replyTarget.id] || []), newComment]
          }));
          // Increase parent comment replyCount in UI
          setCommentsData(prev => ({
            ...prev,
            [reviewId]: (prev[reviewId] || []).map(c =>
              c._id === replyTarget.id ? { ...c, replyCount: (c.replyCount || 0) + 1 } : c
            )
          }));
          setOpenReplies(prev => ({ ...prev, [replyTarget.id]: true }));
        } else {
          // Add to top-level comments list
          setCommentsData(prev => ({
            ...prev,
            [reviewId]: [newComment, ...(prev[reviewId] || [])]
          }));
        }

        setCommentsInputs(prev => ({ ...prev, [reviewId]: '' }));
        setReplyingToComment(prev => ({ ...prev, [reviewId]: null }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post comment');
    }
  };

  const handleLikeComment = async (reviewId: string, commentId: string, isReply: boolean = false, parentId?: string) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/reviews/comments/${commentId}/like`);
      if (res.data.success) {
        if (isReply && parentId) {
          setRepliesData(prev => ({
            ...prev,
            [parentId]: (prev[parentId] || []).map(c => (c._id === commentId ? { ...c, likes: res.data.likes } : c))
          }));
        } else {
          setCommentsData(prev => ({
            ...prev,
            [reviewId]: (prev[reviewId] || []).map(c => (c._id === commentId ? { ...c, likes: res.data.likes } : c))
          }));
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to like comment');
    }
  };

  const loadReplies = async (commentId: string) => {
    setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
    try {
      const res = await axios.get(`http://localhost:5000/api/reviews/comments/${commentId}/replies`);
      if (res.data.success) {
        setRepliesData(prev => ({ ...prev, [commentId]: res.data.replies }));
        setOpenReplies(prev => ({ ...prev, [commentId]: true }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const toggleRepliesSection = (commentId: string) => {
    const isCurrentlyOpen = !!openReplies[commentId];
    setOpenReplies(prev => ({ ...prev, [commentId]: !isCurrentlyOpen }));
    if (!isCurrentlyOpen && !repliesData[commentId]) {
      loadReplies(commentId);
    }
  };

  // Moderation Reports
  const handleOpenReportModal = (reviewId: string) => {
    setReportingReviewId(reviewId);
    setReportReason('Spam');
    setReportComment('');
    setReportSuccess(false);
    setShowReportModal(true);
    setActiveMenuId(null);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const res = await axios.post(`http://localhost:5000/api/reviews/${reportingReviewId}/report`, {
        reason: reportReason,
        comment: reportComment
      });
      if (res.data.success) {
        setReportSuccess(true);
        setTimeout(() => {
          setShowReportModal(false);
        }, 1500);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to file report');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-dark-950 flex flex-col justify-center items-center gap-2">
        <RefreshCw className="h-7 w-7 text-brand-400 animate-spin" />
        <span className="text-xs text-dark-400">Loading user profile...</span>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">Profile not found</h3>
        <p className="text-xs text-dark-500 mt-1 max-w-xs mx-auto leading-relaxed">This student account does not exist or has been removed.</p>
        <Link to="/" className="glass-btn-primary py-2 px-5 text-[10px] mt-4 uppercase">Back to Catalog</Link>
      </div>
    );
  }

  const userStars = [];
  const roundedRating = Math.round(profileUser.avgRating || 0);
  for (let i = 1; i <= 5; i++) {
    userStars.push(
      <Star key={i} className={`h-4.5 w-4.5 ${i <= roundedRating ? 'fill-amber-400 text-amber-400' : 'text-dark-600'}`} />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-left animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: User Card Info & Stats */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card p-6 border-white/[0.05] bg-dark-900/10">
            <div className="flex flex-col items-center text-center">
              <img
                src={profileUser.avatar}
                alt="Avatar"
                className="h-24 w-24 rounded-2xl bg-dark-950 object-cover shadow-lg border border-white/[0.08] mb-4"
              />
              <div className="flex items-center gap-1.5 justify-center">
                <h2 className="text-lg font-outfit font-extrabold text-white">{profileUser.name}</h2>
                {profileUser.isVerified && (
                  <span title="College Verified Student">
                    <CheckCircle className="h-4.5 w-4.5 fill-accent-500/10 text-accent-400" />
                  </span>
                )}
              </div>
              <p className="text-xs text-dark-400 uppercase tracking-widest font-bold mt-1">
                Dept: {profileUser.department || 'General'} | Sem {profileUser.semester || 'N/A'}
              </p>

              {/* Trust Stats Box */}
              <div className="mt-6 w-full p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">{userStars}</div>
                  <span className="text-sm font-extrabold text-white ml-1">
                    {profileUser.avgRating > 0 ? profileUser.avgRating.toFixed(1) : 'N/A'}
                  </span>
                </div>
                <span className="text-[10px] text-dark-450 uppercase tracking-widest font-bold mt-2">
                  Based on {profileUser.reviewCount} review{profileUser.reviewCount !== 1 && 's'}
                </span>
              </div>

              {/* Review CTA (if eligible) */}
              {isEligible && (
                <button
                  onClick={handleOpenLeaveReview}
                  className="glass-btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider mt-5 shadow-glow-indigo flex items-center justify-center gap-2"
                >
                  <Award className="h-4 w-4" /> Review this exchange
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Navigation Tabs & List View */}
        <main className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex gap-4 border-b border-white/[0.06]">
            <button
              onClick={() => setActiveTab('listings')}
              className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'listings' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-450 hover:text-dark-200'
              }`}
            >
              <BookOpen className="h-4 w-4" /> Shared Books ({listings.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'reviews' ? 'border-brand-500 text-brand-400' : 'border-transparent text-dark-450 hover:text-dark-200'
              }`}
            >
              <Star className="h-4 w-4" /> Reviews & Feedback ({reviewCount})
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {activeTab === 'listings' ? (
              /* SHARED BOOKS TAB */
              loadingListings ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="h-6 w-6 text-brand-400 animate-spin" />
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-20 bg-dark-900/10 rounded-2xl border border-dashed border-white/[0.05]">
                  <BookOpen className="h-8 w-8 text-dark-500 mx-auto mb-3" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-dark-250">No books available</h4>
                  <p className="text-xs text-dark-500 mt-1">This student doesn't have any active book listings in the market.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {listings.map((item) => (
                    <BookCard key={item._id} resource={item} />
                  ))}
                </div>
              )
            ) : (
              /* REVIEWS & FEEDBACK TAB */
              <div className="flex flex-col gap-6">
                
                {/* Header Filter Section */}
                <div className="flex justify-between items-center bg-white/[0.01] p-3 rounded-2xl border border-white/[0.04]">
                  <span className="text-[10px] text-dark-450 uppercase tracking-widest font-extrabold">Sort reviews</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="glass-input text-[11px] font-bold uppercase tracking-wider py-1 px-3 w-40 h-8 text-white rounded-xl border-white/[0.06]"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="highest">Highest Rating</option>
                    <option value="lowest">Lowest Rating</option>
                    <option value="helpful">Most Helpful</option>
                  </select>
                </div>

                {loadingReviews ? (
                  <div className="flex justify-center py-10">
                    <RefreshCw className="h-6 w-6 text-brand-400 animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-20 bg-dark-900/10 rounded-2xl border border-dashed border-white/[0.05]">
                    <Star className="h-8 w-8 text-dark-500 mx-auto mb-3" />
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-dark-250">No reviews yet</h4>
                    <p className="text-xs text-dark-500 mt-1">Be the first to leave a feedback review after completing an exchange!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {reviews.map((rev) => {
                      const isOwnerOfReview = !!(currentUser && currentUser.id === rev.reviewer?._id);
                      const hasLiked = !!(currentUser && rev.likes?.some((id: string) => id === currentUser.id));
                      const hasDisliked = !!(currentUser && rev.dislikes?.some((id: string) => id === currentUser.id));

                      // Limit edits to 30 days
                      const diffTime = Math.abs(new Date().getTime() - new Date(rev.createdAt).getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const canEdit = isOwnerOfReview && diffDays <= 30;

                      return (
                        <div key={rev._id} className="glass-card p-5 border-white/[0.05] bg-dark-900/10 flex flex-col gap-4.5 rounded-2xl relative text-left">
                          
                          {/* Review Author Info */}
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <img
                                src={rev.reviewer?.avatar}
                                className="h-9 w-9 rounded-lg object-cover border border-white/[0.08]"
                                alt=""
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white leading-tight">{rev.reviewer?.name}</span>
                                  {rev.reviewer?.isVerified && (
                                    <CheckCircle className="h-3.5 w-3.5 fill-accent-500/10 text-accent-400" />
                                  )}
                                </div>
                                <span className="text-[9px] text-dark-450 font-bold uppercase tracking-wider mt-0.5 block">
                                  Dept: {rev.reviewer?.department} | Sem {rev.reviewer?.semester}
                                </span>
                              </div>
                            </div>

                            {/* Dropdown Menu Trigger for Reports/Edits */}
                            <div className="flex items-center gap-3">
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, idx) => (
                                  <Star
                                    key={idx}
                                    className={`h-3.5 w-3.5 ${idx < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-dark-600'}`}
                                  />
                                ))}
                              </div>

                              <div className="relative">
                                <button
                                  onClick={() => setActiveMenuId(activeMenuId === rev._id ? null : rev._id)}
                                  className="text-dark-450 hover:text-white p-1 hover:bg-white/[0.03] rounded-lg"
                                >
                                  <MoreVertical className="h-4.5 w-4.5" />
                                </button>
                                {activeMenuId === rev._id && (
                                  <div className="absolute right-0 mt-1.5 w-36 bg-dark-900 border border-white/[0.08] rounded-xl shadow-2xl z-20 py-1 overflow-hidden divide-y divide-white/[0.06]">
                                    {isOwnerOfReview ? (
                                      <>
                                        {canEdit && (
                                          <button
                                            onClick={() => handleOpenEditReview(rev)}
                                            className="flex w-full items-center gap-2 px-3.5 py-2 text-[10px] font-bold uppercase text-dark-250 hover:bg-white/[0.02]"
                                          >
                                            <Edit3 className="h-3.5 w-3.5 text-brand-400" /> Edit Review
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            handleDeleteReview(rev._id);
                                            setActiveMenuId(null);
                                          }}
                                          className="flex w-full items-center gap-2 px-3.5 py-2 text-[10px] font-bold uppercase text-red-400 hover:bg-red-500/5"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenReportModal(rev._id)}
                                        className="flex w-full items-center gap-2 px-3.5 py-2 text-[10px] font-bold uppercase text-amber-400 hover:bg-white/[0.02]"
                                      >
                                        <AlertTriangle className="h-3.5 w-3.5" /> Report
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Verified Badge / Details */}
                          <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider font-extrabold text-accent-400 bg-accent-500/5 py-1 px-2.5 rounded-lg border border-accent-500/10 self-start">
                            <ShieldCheck className="h-3.5 w-3.5 text-accent-400" /> Verified Transaction &bull; {rev.reviewType}
                          </div>

                          {/* Review Content */}
                          <p className="text-xs text-dark-250 leading-relaxed font-medium bg-white/[0.01] p-3 rounded-2xl border border-white/[0.04] italic">
                            "{rev.comment}"
                          </p>

                          {/* Footer Actions: Social reactions, Comment toggle, Timestamp */}
                          <div className="flex justify-between items-center border-t border-white/[0.04] pt-3.5">
                            <div className="flex items-center gap-4.5">
                              {/* Likes */}
                              <button
                                onClick={() => handleLikeReview(rev._id)}
                                disabled={isOwnerOfReview}
                                className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider ${
                                  hasLiked ? 'text-accent-400 font-extrabold' : 'text-dark-400 hover:text-white'
                                }`}
                              >
                                <ThumbsUp className={`h-4.5 w-4.5 ${hasLiked ? 'fill-accent-400' : ''}`} />
                                <span>{rev.likes?.length || 0}</span>
                              </button>
                              
                              {/* Dislikes */}
                              <button
                                onClick={() => handleDislikeReview(rev._id)}
                                disabled={isOwnerOfReview}
                                className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider ${
                                  hasDisliked ? 'text-red-400 font-extrabold' : 'text-dark-400 hover:text-white'
                                }`}
                              >
                                <ThumbsDown className={`h-4.5 w-4.5 ${hasDisliked ? 'fill-red-400' : ''}`} />
                                <span>{rev.dislikes?.length || 0}</span>
                              </button>

                              {/* Comments */}
                              <button
                                onClick={() => toggleCommentsSection(rev._id)}
                                className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-dark-400 hover:text-white"
                              >
                                <MessageSquare className="h-4.5 w-4.5" /> Comments
                              </button>
                            </div>
                            <span className="text-[10px] text-dark-500 font-semibold flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(rev.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>

                          {/* Instagram Threaded Comments Container */}
                          {openComments[rev._id] && (
                            <div className="border-t border-white/[0.04] pt-4 flex flex-col gap-4 bg-white/[0.01] -mx-5 px-5 -mb-5 pb-5 rounded-b-2xl">
                              <span className="text-[9px] uppercase tracking-widest text-dark-500 font-bold">Comments Section</span>
                              
                              {/* Comments List */}
                              {loadingComments[rev._id] ? (
                                <div className="flex justify-center py-2">
                                  <RefreshCw className="h-5 w-5 text-brand-400 animate-spin" />
                                </div>
                              ) : (commentsData[rev._id] || []).length === 0 ? (
                                <div className="text-xs text-dark-500 italic py-2 text-center">No comments yet. Write one below!</div>
                              ) : (
                                <div className="flex flex-col gap-3.5 max-h-80 overflow-y-auto pr-1">
                                  {(commentsData[rev._id] || []).map((c) => {
                                    const commentLikesCount = c.likes?.length || 0;
                                    const hasLikedComment = !!(currentUser && c.likes?.includes(currentUser.id));
                                    const isOwnerOfComment = !!(currentUser && currentUser.id === c.user?._id);

                                    return (
                                      <div key={c._id} className="flex flex-col gap-2.5 text-xs text-left bg-dark-950/20 p-3 rounded-2xl border border-white/[0.02]">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex gap-2.5">
                                            <img
                                              src={c.user?.avatar}
                                              className="h-7 w-7 rounded-md object-cover border border-white/[0.05]"
                                              alt=""
                                            />
                                            <div>
                                              <div className="flex items-center gap-1.5">
                                                <span className="font-extrabold text-white text-xs">{c.user?.name}</span>
                                                {c.user?.isVerified && (
                                                  <CheckCircle className="h-3 w-3 fill-accent-500/10 text-accent-400" />
                                                )}
                                                <span className="text-[9px] text-dark-500 font-semibold">
                                                  {new Date(c.createdAt).toLocaleDateString()}
                                                </span>
                                              </div>
                                              <p className="text-dark-200 mt-1 leading-relaxed">{c.text}</p>
                                            </div>
                                          </div>

                                          {/* Like Comment Action */}
                                          <button
                                            onClick={() => handleLikeComment(rev._id, c._id)}
                                            disabled={isOwnerOfComment}
                                            className={`flex items-center gap-1 hover:text-white p-1 rounded transition-colors ${
                                              hasLikedComment ? 'text-accent-400' : 'text-dark-500'
                                            }`}
                                          >
                                            <ThumbsUp className="h-3.5 w-3.5" />
                                            <span className="text-[9px] font-bold">{commentLikesCount}</span>
                                          </button>
                                        </div>

                                        {/* Action buttons under comment (Reply, Toggle replies) */}
                                        <div className="flex items-center gap-4 pl-9.5 text-[9px] font-bold uppercase tracking-wider text-dark-450">
                                          <button
                                            onClick={() => setReplyingToComment(prev => ({
                                              ...prev,
                                              [rev._id]: { id: c._id, name: c.user?.name || 'User' }
                                            }))}
                                            className="hover:text-white"
                                          >
                                            Reply
                                          </button>

                                          {/* View replies lazy loading trigger */}
                                          {c.replyCount > 0 && (
                                            <button
                                              onClick={() => toggleRepliesSection(c._id)}
                                              className="hover:text-white flex items-center gap-0.5 text-brand-400"
                                            >
                                              {openReplies[c._id] ? (
                                                <>Hide Replies <ChevronUp className="h-3 w-3" /></>
                                              ) : (
                                                <>View {c.replyCount} Repl{c.replyCount === 1 ? 'y' : 'ies'} <ChevronDown className="h-3 w-3" /></>
                                              )}
                                            </button>
                                          )}
                                        </div>

                                        {/* Threaded Replies section */}
                                        {openReplies[c._id] && (
                                          <div className="pl-9.5 flex flex-col gap-2.5 border-l border-white/[0.04] mt-2 ml-3">
                                            {loadingReplies[c._id] ? (
                                              <div className="py-1">
                                                <RefreshCw className="h-4 w-4 text-brand-400 animate-spin" />
                                              </div>
                                            ) : (
                                              (repliesData[c._id] || []).map((reply) => {
                                                const replyLikesCount = reply.likes?.length || 0;
                                                const hasLikedReply = !!(currentUser && reply.likes?.includes(currentUser.id));
                                                const isOwnerOfReply = !!(currentUser && currentUser.id === reply.user?._id);

                                                return (
                                                  <div key={reply._id} className="flex flex-col gap-1.5 p-2 bg-dark-950/40 rounded-xl border border-white/[0.02]">
                                                    <div className="flex items-start justify-between gap-3">
                                                      <div className="flex gap-2">
                                                        <img
                                                          src={reply.user?.avatar}
                                                          className="h-6 w-6 rounded-md object-cover border border-white/[0.05]"
                                                          alt=""
                                                        />
                                                        <div>
                                                          <div className="flex items-center gap-1">
                                                            <span className="font-extrabold text-white text-[11px]">{reply.user?.name}</span>
                                                            {reply.user?.isVerified && (
                                                              <CheckCircle className="h-2.5 w-2.5 fill-accent-500/10 text-accent-400" />
                                                            )}
                                                            <span className="text-[8px] text-dark-500 font-semibold">
                                                              {new Date(reply.createdAt).toLocaleDateString()}
                                                            </span>
                                                          </div>
                                                          <p className="text-dark-350 text-[11px] mt-0.5 leading-relaxed">{reply.text}</p>
                                                        </div>
                                                      </div>

                                                      {/* Like Reply */}
                                                      <button
                                                        onClick={() => handleLikeComment(rev._id, reply._id, true, c._id)}
                                                        disabled={isOwnerOfReply}
                                                        className={`flex items-center gap-0.5 hover:text-white p-0.5 rounded transition-colors ${
                                                          hasLikedReply ? 'text-accent-400' : 'text-dark-500'
                                                        }`}
                                                      >
                                                        <ThumbsUp className="h-3 w-3" />
                                                        <span className="text-[8px] font-bold">{replyLikesCount}</span>
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Comment Form Input */}
                              <form onSubmit={(e) => handleCommentSubmit(e, rev._id)} className="flex flex-col gap-2 mt-2">
                                {replyingToComment[rev._id] && (
                                  <div className="flex items-center justify-between bg-white/[0.02] p-1 px-3 rounded-lg border border-white/[0.04] text-[10px] font-semibold text-brand-400">
                                    <span>Replying to @{replyingToComment[rev._id]?.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => setReplyingToComment(prev => ({ ...prev, [rev._id]: null }))}
                                      className="text-red-400"
                                    >
                                      &times; Cancel
                                    </button>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder={replyingToComment[rev._id] ? "Write a reply..." : "Add a comment..."}
                                    value={commentsInputs[rev._id] || ''}
                                    onChange={(e) => setCommentsInputs(prev => ({ ...prev, [rev._id]: e.target.value }))}
                                    className="glass-input flex-grow text-xs py-2 px-3.5 border-white/[0.08]"
                                    required
                                  />
                                  <button
                                    type="submit"
                                    className="glass-btn-primary p-2 text-xs flex items-center justify-center aspect-square shrink-0 shadow-none border-white/[0.08] hover:bg-brand-500/10"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Review Modal (Create / Edit) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/85 backdrop-blur-md p-4">
          <div className="glass-card max-w-md w-full p-6 border-white/[0.08] bg-dark-900/90 shadow-2xl relative text-left">
            <h3 className="font-outfit text-md font-bold text-white border-b border-white/[0.06] pb-3">
              {editingReviewId ? 'Edit Your Review' : 'Review Exchange'}
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

      {/* Report Review Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/85 backdrop-blur-md p-4">
          <div className="glass-card max-w-md w-full p-6 border-white/[0.08] bg-dark-900/90 shadow-2xl relative text-left">
            <h3 className="font-outfit text-md font-bold text-white border-b border-white/[0.06] pb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Report Inappropriate Review
            </h3>
            {reportSuccess ? (
              <div className="my-6 text-center py-4 flex flex-col items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="h-8 w-8 text-emerald-450 animate-bounce" /> Report submitted. Moderating...
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="flex flex-col gap-4 mt-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-dark-450 uppercase tracking-widest">Reason for reporting</label>
                  <select
                    value={reportReason}
                    onChange={(e: any) => setReportReason(e.target.value)}
                    className="glass-input text-xs py-2 px-3 border-white/[0.08] text-white bg-dark-900"
                  >
                    <option value="Spam">Spam</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Fake Review">Fake Review</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-dark-450 uppercase tracking-widest">Additional comments (Optional)</label>
                  <textarea
                    placeholder="Provide additional details..."
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    className="glass-input text-xs h-20 resize-none py-2 border-white/[0.08]"
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="glass-btn-primary flex-grow py-3 text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 active:bg-red-800"
                  >
                    {submittingReport ? 'Submitting...' : 'File Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="glass-btn-secondary py-3 px-5 text-xs font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
