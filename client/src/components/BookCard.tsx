import React from 'react';
import { Link } from 'react-router-dom';
import { Book, FileText, Bookmark, Calendar } from 'lucide-react';
import { getImageUrl } from '../utils/image';

interface BookCardProps {
  resource: {
    _id: string;
    title: string;
    author: string;
    resourceType: 'Textbook' | 'Notes' | 'Previous Year Paper' | 'Lab Manual' | 'Project Report' | 'E-book/PDF';
    department: string;
    semester: number;
    courseCode: string;
    condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
    exchangeType: 'Borrow' | 'Rent' | 'Buy' | 'Free' | 'Exchange' | 'Both';
    price: number;
    images: string[];
    status: 'Available' | 'Pending' | 'Reserved' | 'Exchanged' | 'Sold';
    owner: {
      name: string;
      avatar: string;
    };
  };
}

export const BookCard: React.FC<BookCardProps> = ({ resource }) => {
  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'Textbook':
        return <Book className="h-3.5 w-3.5" />;
      case 'Notes':
      case 'Previous Year Paper':
      case 'Lab Manual':
      case 'Project Report':
        return <FileText className="h-3.5 w-3.5" />;
      default:
        return <Bookmark className="h-3.5 w-3.5" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case 'Textbook':
        return 'badge-sky';
      case 'Notes':
        return 'badge-violet';
      case 'Previous Year Paper':
        return 'badge-emerald';
      case 'Lab Manual':
        return 'badge-amber';
      case 'Project Report':
        return 'bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase';
      default:
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase';
    }
  };

  const getExchangeBadge = (type: string) => {
    switch (type) {
      case 'Free':
        return 'bg-emerald-500/20 text-emerald-300';
      case 'Borrow':
        return 'bg-blue-500/20 text-blue-300';
      case 'Rent':
        return 'bg-amber-500/20 text-amber-300';
      case 'Buy':
        return 'bg-purple-500/20 text-purple-300';
      case 'Exchange':
        return 'bg-pink-500/20 text-pink-300';
      case 'Both':
        return 'bg-cyan-500/20 text-cyan-300';
      default:
        return 'bg-dark-800 text-dark-300';
    }
  };

  return (
    <div className="glass-card glass-card-hover group flex flex-col h-full overflow-hidden border border-white/[0.05] hover:border-brand-500/25 shadow-lg hover:shadow-glass-primary transition-all duration-300">
      {/* Cover Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-dark-950/60 border-b border-white/[0.04]">
        <img
          src={getImageUrl(resource.images[0])}
          alt={resource.title}
          className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Soft shadow overlay to make text pop */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950/70 via-transparent to-black/30 pointer-events-none" />

        {/* Floating Badges */}
        <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-1.5 z-10">
          <span className={`inline-flex items-center gap-1 shadow-md ${getResourceTypeBadge(resource.resourceType)}`}>
            {getResourceTypeIcon(resource.resourceType)}
            {resource.resourceType}
          </span>
        </div>

        <div className="absolute bottom-3.5 right-3.5 z-10">
          <span className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider shadow-lg backdrop-blur-md ${getExchangeBadge(resource.exchangeType)}`}>
            {resource.exchangeType}
            {resource.exchangeType !== 'Free' && resource.exchangeType !== 'Borrow' && resource.exchangeType !== 'Exchange' && ` : ₹${resource.price}`}
            {resource.exchangeType === 'Rent' && '/mo'}
          </span>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-5 flex flex-col flex-grow text-left">
        <div className="flex items-center gap-2 text-dark-450 text-[10px] font-bold uppercase tracking-wider mb-2">
          <span className="truncate max-w-[150px]" title={resource.department}>{resource.department}</span>
          <span>•</span>
          <span className="flex items-center gap-0.5 whitespace-nowrap"><Calendar className="h-3 w-3" /> Sem {resource.semester}</span>
        </div>

        <h3 className="text-base font-extrabold text-dark-100 line-clamp-1 group-hover:text-brand-400 transition-colors duration-300">
          {resource.title}
        </h3>
        
        <p className="text-xs text-dark-400 mt-1 mb-4 line-clamp-1 font-medium italic">
          by {resource.author}
        </p>

        {/* Separator */}
        <div className="h-[1px] bg-white/[0.05] my-2" />

        <div className="mt-auto flex items-center justify-between pt-2">
          {/* Condition and Course Code */}
          <div className="flex flex-col">
            <span className="text-[9px] text-dark-500 font-bold uppercase tracking-wider">Course Code</span>
            <span className="text-xs font-bold text-dark-200 mt-0.5">{resource.courseCode}</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[9px] text-dark-500 font-bold uppercase tracking-wider">Condition</span>
            <span className="text-xs font-bold text-accent-400 mt-0.5">{resource.condition}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <Link 
        to={`/resources/${resource._id}`}
        className="block text-center py-3.5 bg-white/[0.02] hover:bg-brand-500 text-[11px] font-bold uppercase tracking-wider text-dark-300 hover:text-white border-t border-white/[0.04] hover:border-transparent transition-all duration-300"
      >
        View Details & Request
      </Link>
    </div>
  );
};
