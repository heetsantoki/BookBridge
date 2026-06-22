export const getImageUrl = (url?: string) => {
  if (!url) return 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // If it starts with /uploads/ or other relative backend paths, prepend the backend host
  return `http://localhost:5000${url}`;
};
