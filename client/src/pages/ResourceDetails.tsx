import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/image';
import {
  Info, ShieldCheck, Mail, Phone,
  MessageSquare, Heart, RefreshCw, Send, Star, AlertCircle
} from 'lucide-react';

export const ResourceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [resource, setResource] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [contactShared, setContactShared] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved'>('none');

  // Exchange request states
  const [exchangeRequestStatus, setExchangeRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'completed'>('none');
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [myAvailableBooks, setMyAvailableBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [submittingExchange, setSubmittingExchange] = useState(false);
  const [loadingAvailableBooks, setLoadingAvailableBooks] = useState(false);

  // Review states
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Active transaction id for review posting
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const detailsRes = await axios.get(`http://localhost:5000/api/resources/${id}`);
      if (detailsRes.data.success) {
        setResource(detailsRes.data.resource);
        setOwner(detailsRes.data.owner);
        setContactShared(detailsRes.data.contactShared);
      }

      // Check wishlist state
      const wishRes = await axios.get('http://localhost:5000/api/resources/wishlist');
      if (wishRes.data.success) {
        const isMatched = wishRes.data.wishlist.some((item: any) => item._id === id);
        setIsWishlisted(isMatched);
      }

      // Check trade request status
      const exchangesRes = await axios.get('http://localhost:5000/api/transactions/my-exchanges');
      if (exchangesRes.data.success) {
        const matchingRequest = exchangesRes.data.outgoing.find((t: any) => t.resource._id === id);
        if (matchingRequest) {
          if (matchingRequest.status === 'Approved') {
            setRequestStatus('approved');
            setActiveTransactionId(matchingRequest._id);
            setContactShared(true);
          } else if (matchingRequest.status === 'Completed') {
            setRequestStatus('approved'); // Allow reviewing
            setActiveTransactionId(matchingRequest._id);
            setContactShared(true);
          } else if (matchingRequest.status === 'Pending') {
            setRequestStatus('pending');
          }
        }
      }

      // Check exchange requests status
      if (user) {
        const exchRes = await axios.get('http://localhost:5000/api/exchange-requests/my-requests');
        if (exchRes.data.success) {
          const matchingExch = exchRes.data.outgoing.find((t: any) => t.requestedBook._id === id);
          if (matchingExch) {
            if (matchingExch.status === 'Accepted') {
              setExchangeRequestStatus('accepted');
              setContactShared(true);
            } else if (matchingExch.status === 'Completed') {
              setExchangeRequestStatus('completed');
              setContactShared(true);
            } else if (matchingExch.status === 'Pending') {
              setExchangeRequestStatus('pending');
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching resource details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExchangeModal = async () => {
    if (!user) return navigate('/auth');
    setShowExchangeModal(true);
    setLoadingAvailableBooks(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/resources?ownerId=${user.id}`);
      if (res.data.success) {
        const available = res.data.resources.filter((b: any) => b.status === 'Available');
        setMyAvailableBooks(available);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load your available books.');
    } finally {
      setLoadingAvailableBooks(false);
    }
  };

  const submitExchangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) {
      alert('Please select a book to offer for exchange');
      return;
    }
    setSubmittingExchange(true);
    try {
      const res = await axios.post('http://localhost:5000/api/exchange-requests', {
        requestedBookId: id,
        offeredBookId: selectedBookId,
        message: messageInput
      });
      if (res.data.success) {
        setExchangeRequestStatus('pending');
        setShowExchangeModal(false);
        setMessageInput('');
        setSelectedBookId('');
        fetchDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit exchange request');
    } finally {
      setSubmittingExchange(false);
    }
  };

  const fetchOwnerReviews = async () => {
    if (!resource?.owner) return;
    try {
      const ownerId = typeof resource.owner === 'object' ? resource.owner._id : resource.owner;
      const res = await axios.get(`http://localhost:5000/api/reviews/user/${ownerId}`);
      if (res.data.success) {
        setReviews(res.data.reviews);
        setAvgRating(res.data.avgRating);
        setReviewCount(res.data.reviewCount);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (resource) {
      fetchOwnerReviews();
    }
  }, [resource]);

  const toggleWishlist = async () => {
    if (!user) return navigate('/auth');
    try {
      const res = await axios.post(`http://localhost:5000/api/resources/${id}/wishlist`);
      if (res.data.success) {
        setIsWishlisted(res.data.wishlisted);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const requestExchange = async () => {
    if (!user) return navigate('/auth');
    try {
      const res = await axios.post('http://localhost:5000/api/transactions', { resourceId: id });
      if (res.data.success) {
        setRequestStatus('pending');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit exchange request');
    }
  };

  const handleChatRedirect = () => {
    if (!user) return navigate('/auth');
    const ownerId = owner._id || owner.id;
    navigate(`/chat?partnerId=${ownerId}&resourceId=${id}`);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activeTransactionId) return;
    setSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(false);
    try {
      const res = await axios.post('http://localhost:5000/api/reviews', {
        transactionId: activeTransactionId,
        rating: ratingInput,
        comment: commentInput
      });
      if (res.data.success) {
        setReviewSuccess(true);
        setCommentInput('');
        fetchOwnerReviews();
      }
    } catch (err: any) {
      setReviewError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <RefreshCw className="h-8 w-8 text-brand-400 animate-spin" />
        <span className="text-sm text-dark-400 font-semibold">Loading details...</span>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="mx-auto max-w-xl text-center py-20 px-4">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-dark-200">Listing Not Found</h3>
        <p className="text-sm text-dark-500 mt-2">The textbook resource you are searching for might have been deleted by the owner.</p>
        <Link to="/" className="glass-btn-primary mt-6 inline-block py-2.5 px-6">Return to Catalog</Link>
      </div>
    );
  }

  const isOwner = !!(user && user.id === resource.owner.toString());

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-left">
      {/* Back to browse */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-dark-400 hover:text-dark-200 font-bold uppercase tracking-wider mb-6">
        &larr; Back to Listings
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT COLUMN: Resource Gallery & Summary */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Cover Carousel Box */}
          <div className="glass-card aspect-[4/3] w-full overflow-hidden bg-dark-950 relative flex items-center justify-center">
            <img
              src={getImageUrl(resource.images[0])}
              alt={resource.title}
              className="h-full w-full object-contain"
            />
          </div>

          {/* Details Panel */}
          <div className="glass-card p-6 sm:p-8 flex flex-col gap-5">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="badge-sky text-xs font-semibold px-3 py-1 rounded-full border">
                  {resource.resourceType}
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                  Condition: {resource.condition}
                </span>
              </div>
              <h1 className="font-outfit text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {resource.title}
              </h1>
              <p className="text-sm text-dark-400 mt-1">by {resource.author}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 bg-dark-950/40 p-4 rounded-xl border border-dark-850">
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">Course Code</span>
                <span className="text-sm font-semibold text-dark-200">{resource.courseCode}</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">Department</span>
                <span className="text-sm font-semibold text-dark-200">{resource.department}</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">Semester Level</span>
                <span className="text-sm font-semibold text-dark-200">Semester {resource.semester}</span>
              </div>
            </div>

            <div className="flex flex-col text-left gap-2">
              <h3 className="text-sm font-bold text-dark-300">Listing Description</h3>
              <p className="text-sm text-dark-400 leading-relaxed whitespace-pre-line bg-dark-950/20 p-4 rounded-xl border border-dark-900">
                {resource.description}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Actions & Trust Profile */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Exchange Actions Panel */}
          <div className="glass-card p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-dark-850 pb-4">
              <div>
                <span className="text-xs text-dark-500 uppercase tracking-wider font-bold">Exchange Model</span>
                <p className="text-lg font-extrabold text-white tracking-wide uppercase mt-0.5">{resource.exchangeType}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-dark-500 uppercase tracking-wider font-bold">Price</span>
                <p className="text-2xl font-extrabold text-accent-400 tracking-wide mt-0.5">
                  {resource.exchangeType === 'Free' ? 'Free' : `₹${resource.price}`}
                  {resource.exchangeType === 'Rent' && <span className="text-xs text-dark-400 font-normal">/mo</span>}
                </p>
              </div>
            </div>

            {/* Privacy Alert Banner */}
            <div className={`p-4 rounded-xl border flex gap-3 text-xs leading-normal ${
              contactShared 
                ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400' 
                : 'bg-dark-950/60 border-dark-800 text-dark-400'
            }`}>
              {contactShared ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold">Contact Unlocked!</span>
                    <p className="mt-0.5 text-[11px] leading-relaxed">Mutual confirmation achieved. Call/Email your trade partner to arrange exchange handoff.</p>
                  </div>
                </>
              ) : (
                <>
                  <Info className="h-5 w-5 text-brand-400 shrink-0" />
                  <div>
                    <span className="font-bold">University Privacy Shield</span>
                    <p className="mt-0.5 text-[11px] leading-relaxed">Student contact details remain hidden until the listing owner approves your request.</p>
                  </div>
                </>
              )}
            </div>

            {/* Actions Trigger Box */}
            {isOwner ? (
              <div className="flex flex-col gap-3">
                <Link to={`/dashboard`} className="glass-btn-primary text-center text-sm">
                  Manage Listings
                </Link>
                <div className="text-center text-xs text-dark-500">
                  This is your listing. Edit or delete it from your dashboard.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {resource.status === 'Exchanged' || resource.status === 'Sold' ? (
                  <button disabled className="glass-btn-secondary w-full text-sm bg-dark-900 border-dark-800 text-dark-550 cursor-not-allowed">
                    Resource Sold / Exchanged
                  </button>
                ) : resource.status === 'Reserved' ? (
                  <button disabled className="glass-btn-secondary w-full text-sm bg-dark-900 border-dark-800 text-amber-500 cursor-not-allowed">
                    Resource Reserved
                  </button>
                ) : (
                  <>
                    {(exchangeRequestStatus === 'accepted' || requestStatus === 'approved') ? (
                      <button disabled className="glass-btn-accent w-full text-sm flex items-center justify-center gap-2 bg-emerald-700/80 text-white cursor-default">
                        <ShieldCheck className="h-4.5 w-4.5" /> Exchange Approved
                      </button>
                    ) : exchangeRequestStatus === 'completed' ? (
                      <button disabled className="glass-btn-secondary w-full text-sm bg-dark-900 border-dark-800 text-blue-400 cursor-default">
                        Exchange Completed
                      </button>
                    ) : (
                      <div className="flex flex-col gap-3 w-full">
                        {/* 1. Exchange workflow button (if type is Exchange or Both) */}
                        {(resource.exchangeType === 'Exchange' || resource.exchangeType === 'Both') && (
                          exchangeRequestStatus === 'pending' ? (
                            <button disabled className="glass-btn-secondary w-full text-sm flex items-center justify-center gap-2 bg-dark-900 border-dark-800 text-brand-400 cursor-default">
                              <RefreshCw className="h-4 w-4 animate-spin" /> Pending Exchange Approval
                            </button>
                          ) : (
                            <button 
                              onClick={handleOpenExchangeModal} 
                              disabled={!!(user && !user.isVerified)}
                              className="glass-btn-primary w-full text-sm flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white"
                            >
                              Request Exchange
                            </button>
                          )
                        )}

                        {/* 2. Standard transaction button (if type is NOT Exchange) */}
                        {resource.exchangeType !== 'Exchange' && (
                          requestStatus === 'pending' ? (
                            <button disabled className="glass-btn-secondary w-full text-sm flex items-center justify-center gap-2 bg-dark-900 border-dark-800 text-brand-400 cursor-default">
                              <RefreshCw className="h-4 w-4 animate-spin" /> Pending Approval
                            </button>
                          ) : (
                            <button 
                              onClick={requestExchange} 
                              disabled={!!(user && !user.isVerified)}
                              className="glass-btn-primary w-full text-sm flex items-center justify-center gap-2"
                            >
                              {resource.exchangeType === 'Borrow' && 'Request Borrow'}
                              {resource.exchangeType === 'Rent' && 'Request Rent'}
                              {resource.exchangeType === 'Buy' && 'Request Purchase'}
                              {resource.exchangeType === 'Free' && 'Request Giveaway'}
                              {resource.exchangeType === 'Both' && 'Request Buy / Rent / Borrow'}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleChatRedirect} className="glass-btn-secondary text-sm flex items-center justify-center gap-2 py-2.5">
                    <MessageSquare className="h-4 w-4" /> Message
                  </button>
                  <button onClick={toggleWishlist} className={`glass-btn-secondary text-sm flex items-center justify-center gap-2 py-2.5 ${
                    isWishlisted ? 'border-brand-500/50 text-brand-400 bg-brand-500/5' : ''
                  }`}>
                    <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-brand-400' : ''}`} /> Wishlist
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Owner Profile Panel */}
          {owner && (
            <div className="glass-card p-6 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-dark-500 uppercase tracking-wider border-b border-dark-850 pb-2">Listed By</h3>
              <div className="flex items-center gap-3">
                <img src={owner.avatar} alt="owner avatar" className="h-11 w-11 rounded-lg bg-dark-950 object-cover" />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-dark-100">{owner.name}</span>
                  <span className="text-xs text-dark-400 leading-normal">{owner.department}</span>
                </div>
              </div>

              {/* Show contact details ONLY if shared */}
              {contactShared && (
                <div className="flex flex-col gap-2 bg-dark-950/40 p-4 rounded-xl border border-dark-850 text-xs">
                  <div className="flex items-center gap-2 text-dark-300">
                    <Mail className="h-4 w-4 text-brand-400" />
                    <span>{owner.email}</span>
                  </div>
                  {owner.phone && (
                    <div className="flex items-center gap-2 text-dark-300 mt-1">
                      <Phone className="h-4 w-4 text-brand-400" />
                      <span>{owner.phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Owner Trust score stats */}
              <div className="flex items-center gap-3 mt-1.5 p-3 rounded-xl bg-dark-950/20 border border-dark-900">
                <div className="flex items-center gap-1 text-amber-400 font-bold text-sm">
                  <Star className="h-4.5 w-4.5 fill-amber-400" />
                  <span>{avgRating ? avgRating : 'N/A'}</span>
                </div>
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">
                  ({reviewCount} Review{reviewCount !== 1 && 's'})
                </span>
              </div>
            </div>
          )}

          {/* Review Submission Form - Display ONLY if user has a confirmed transaction with seller */}
          {activeTransactionId && !isOwner && !reviewSuccess && (
            <div className="glass-card p-6 text-left">
              <h3 className="text-xs font-bold text-dark-500 uppercase tracking-wider border-b border-dark-850 pb-2">Rate this Exchange</h3>
              {reviewError && (
                <div className="my-3 text-xs text-red-400 font-semibold">{reviewError}</div>
              )}
              <form onSubmit={submitReview} className="flex flex-col gap-3.5 mt-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-dark-400">Score Rating</label>
                  <div className="flex gap-1.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingInput(star)}
                        className="text-amber-400 hover:scale-110 transition-transform duration-100"
                      >
                        <Star className={`h-6 w-6 ${ratingInput >= star ? 'fill-amber-400' : 'text-dark-500'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-dark-400">Your review comment</label>
                  <textarea
                    placeholder="Describe book quality, response times, or coordination..."
                    className="glass-input text-xs h-20 resize-none py-2"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="glass-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> Submit Review
                </button>
              </form>
            </div>
          )}

          {/* Reviews list */}
          <div className="glass-card p-6 flex flex-col gap-4 text-left">
            <h3 className="text-xs font-bold text-dark-500 uppercase tracking-wider border-b border-dark-850 pb-2">
              Reviews & Feedback
            </h3>
            {reviews.length === 0 ? (
              <div className="text-xs text-dark-500 py-4 text-center">No review comments yet</div>
            ) : (
              <div className="flex flex-col gap-4 divide-y divide-dark-850/60 max-h-80 overflow-y-auto pr-1">
                {reviews.map((rev) => (
                  <div key={rev._id} className="flex flex-col gap-1.5 pt-3 first:pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={rev.reviewer.avatar} alt="" className="h-6 w-6 rounded-md bg-dark-900" />
                        <span className="text-xs font-bold">{rev.reviewer.name}</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-400 font-bold text-xs">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                        <span>{rev.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-dark-405 leading-relaxed bg-dark-950/20 p-2.5 rounded-lg border border-dark-900 italic">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exchange Modal */}
      {showExchangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="glass-card max-w-lg w-full p-6 sm:p-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-dark-850 pb-4">
              <h3 className="font-outfit text-lg font-bold text-white">Select a Book to Offer</h3>
              <button onClick={() => setShowExchangeModal(false)} className="text-dark-400 hover:text-white">
                <span className="text-xl font-bold">&times;</span>
              </button>
            </div>

            {loadingAvailableBooks ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <RefreshCw className="h-6 w-6 text-brand-400 animate-spin" />
                <span className="text-xs text-dark-400">Loading your books...</span>
              </div>
            ) : myAvailableBooks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-dark-400">You don't have any books with status <strong>Available</strong>.</p>
                <p className="text-xs text-dark-500 mt-1">Please list a book as Available first to offer it in exchange.</p>
                <Link to="/create-listing" className="glass-btn-primary py-2 px-4 text-xs mt-4 inline-block">List a Book</Link>
              </div>
            ) : (
              <form onSubmit={submitExchangeRequest} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {myAvailableBooks.map((book) => (
                    <label key={book._id} className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedBookId === book._id ? 'border-brand-500 bg-brand-500/5' : 'border-dark-800 bg-dark-900/40 hover:border-dark-700'
                    }`}>
                      <input
                        type="radio"
                        name="offeredBook"
                        value={book._id}
                        checked={selectedBookId === book._id}
                        onChange={() => setSelectedBookId(book._id)}
                        className="mt-1"
                      />
                      <div className="flex gap-3 text-left">
                        <img src={getImageUrl(book.images[0])} alt="" className="h-12 w-9 object-cover rounded bg-dark-950 border border-dark-850" />
                        <div className="text-left">
                          <span className="text-[10px] text-dark-400 block font-bold uppercase">{book.resourceType}</span>
                          <span className="text-xs font-bold text-white line-clamp-1">{book.title}</span>
                          <span className="text-[10px] text-dark-500 block">Course: {book.courseCode} | Sem {book.semester}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-dark-350">Message (Optional)</label>
                  <textarea
                    placeholder="e.g. I would like to exchange my Data Structures book."
                    className="glass-input text-xs h-20 resize-none py-2"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingExchange}
                  className="glass-btn-primary py-2.5 text-xs font-bold w-full"
                >
                  {submittingExchange ? 'Submitting Request...' : 'Send Exchange Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
