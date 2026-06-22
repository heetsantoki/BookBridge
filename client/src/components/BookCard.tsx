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
    exchangeType: 'Borrow' | 'Rent' | 'Buy' | 'Free';
    price: number;
    images: string[];
    status: 'Available' | 'Pending' | 'Exchanged';
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
      default:
        return 'bg-dark-800 text-dark-300';
    }
  };

  return (
    <div className="glass-card glass-card-hover group flex flex-col h-full overflow-hidden">
      {/* Cover Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-dark-950">
        <img
          src={getImageUrl(resource.images[0])}
          alt={resource.title}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Floating Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className={`inline-flex items-center gap-1 ${getResourceTypeBadge(resource.resourceType)}`}>
            {getResourceTypeIcon(resource.resourceType)}
            {resource.resourceType}
          </span>
        </div>

        <div className="absolute bottom-3 right-3 z-10">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getExchangeBadge(resource.exchangeType)}`}>
            {resource.exchangeType}
            {resource.exchangeType !== 'Free' && resource.exchangeType !== 'Borrow' && ` : ₹${resource.price}`}
            {resource.exchangeType === 'Rent' && '/mo'}
          </span>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-5 flex flex-col flex-grow text-left">
        <div className="flex items-center gap-2 text-dark-400 text-xs font-semibold mb-1">
          <span>{resource.department}</span>
          <span>•</span>
          <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" /> Sem {resource.semester}</span>
        </div>

        <h3 className="text-base font-bold text-dark-100 line-clamp-1 group-hover:text-brand-400 transition-colors duration-200">
          {resource.title}
        </h3>
        
        <p className="text-xs text-dark-400 mb-4 line-clamp-1">
          by {resource.author}
        </p>

        {/* Separator */}
        <div className="h-[1px] bg-dark-800/60 my-2" />

        <div className="mt-auto flex items-center justify-between pt-2">
          {/* Condition and Course Code */}
          <div className="flex flex-col">
            <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">Course Code</span>
            <span className="text-xs font-semibold text-dark-300">{resource.courseCode}</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">Condition</span>
            <span className="text-xs font-semibold text-accent-400">{resource.condition}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <Link 
        to={`/resources/${resource._id}`}
        className="block text-center py-3 bg-dark-950/40 hover:bg-brand-500 text-xs font-bold text-dark-350 hover:text-white border-t border-dark-800/50 hover:border-transparent transition-all duration-200"
      >
        View Details & Request
      </Link>
    </div>
  );
};
