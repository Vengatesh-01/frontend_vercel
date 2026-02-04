import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaHeart, FaSmile } from 'react-icons/fa';
import getAppUrl from '../utils/urlUtils';

const ReelCommentSection = ({
    comments,
    onClose,
    onAddComment,
    onAddReply,
    commentText,
    setCommentText,
    commentsLoading,
    onEmojiClick,
    commentsCount,
    currentUserAvatar,
    currentUsername,
    isLoggedIn,
    onLikeComment,
    onLikeReply
}) => {
    const scrollContainerRef = useRef(null);
    const [replyingTo, setReplyingTo] = useState(null);

    // Track previous length to determine if a new comment was added
    const prevLength = useRef(comments.length);

    useEffect(() => {
        if (!commentsLoading && comments.length > 0) {
            if (comments.length > prevLength.current) {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        }
        prevLength.current = comments.length;
    }, [comments.length, commentsLoading]);

    const formatTime = (date) => {
        const diff = Math.floor((new Date() - new Date(date)) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    };

    const handleSend = () => {
        if (replyingTo) {
            onAddReply(commentText, replyingTo.commentId);
            setReplyingTo(null);
        } else {
            onAddComment();
        }
        setCommentText('');
    };

    return (
        <div className="w-full md:w-[420px] bg-white h-[85vh] max-h-[650px] flex flex-col shadow-2xl rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-in-right relative m-0 md:m-4 pointer-events-auto font-sans">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
                <div className="w-8"></div> {/* Spacer for centering */}
                <h3 className="text-[16px] font-bold text-gray-900">Comments ({commentsCount})</h3>
                <button onClick={onClose} className="text-gray-900 hover:opacity-60 transition-opacity p-1 w-8 flex justify-end">
                    <FaTimes size={18} />
                </button>
            </div>

            {/* Comments List */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-0"
            >
                {commentsLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-3 border-gray-100 border-t-gray-400 rounded-full animate-spin"></div>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 px-8 text-center">
                        <p className="text-base font-semibold text-gray-900 mb-1">No comments yet.</p>
                        <p className="text-xs">Start the conversation.</p>
                    </div>
                ) : (
                    <div className="flex flex-col pt-2 pb-4">
                        {comments.map((comment) => {
                            // Determine visuals based on provided image style
                            return (
                                <div key={comment.id} className="flex gap-3 px-5 py-4 hover:bg-gray-50 transition-colors group">
                                    <img
                                        src={getAppUrl(comment.avatar)}
                                        className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                                        alt={comment.user}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = `https://ui-avatars.com/api/?name=${comment.user}&background=random`;
                                        }}
                                    />

                                    <div className="flex-1 flex flex-col min-w-0 pt-0.5">
                                        {/* User Info Line */}
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[14px] font-bold text-gray-900 leading-none">{comment.user}</span>
                                            {comment.isReal && (
                                                <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-[4px] font-bold uppercase tracking-wider leading-none">
                                                    CREATOR
                                                </span>
                                            )}
                                            <span className="text-[13px] text-gray-400 font-normal leading-none">{formatTime(comment.createdAt)}</span>
                                        </div>

                                        {/* Comment Text */}
                                        <p className="text-[14px] text-gray-800 leading-snug break-words mb-1.5">
                                            {comment.text}
                                        </p>

                                        {/* Action Line */}
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => {
                                                    setReplyingTo({ commentId: comment.id, username: comment.user });
                                                    setCommentText(`@${comment.user} `);
                                                }}
                                                className="text-[12px] font-bold text-gray-500 hover:text-gray-800 transition-colors"
                                            >
                                                Reply
                                            </button>
                                        </div>

                                        {/* Replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="mt-3 space-y-3 pl-2 border-l-2 border-gray-100">
                                                {comment.replies.map((reply) => (
                                                    <div key={reply.id} className="flex gap-2.5">
                                                        <img
                                                            src={getAppUrl(reply.avatar)}
                                                            className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
                                                            alt={reply.user}
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = `https://ui-avatars.com/api/?name=${reply.user}&background=random`;
                                                            }}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-[12px] font-bold text-gray-900">{reply.user}</span>
                                                                <span className="text-[11px] text-gray-400">{formatTime(reply.createdAt)}</span>
                                                            </div>
                                                            <p className="text-[13px] text-gray-900 leading-snug">{reply.text}</p>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setReplyingTo({ commentId: comment.id, username: reply.user });
                                                                        setCommentText(`@${reply.user} `);
                                                                    }}
                                                                    className="text-[11px] font-semibold text-gray-500 hover:text-gray-800"
                                                                >
                                                                    Reply
                                                                </button>
                                                                <button
                                                                    onClick={() => onLikeReply(comment.id, reply.id)}
                                                                    className={`flex items-center gap-1 ${reply.isLiked ? 'text-red-500' : 'text-gray-400'}`}
                                                                >
                                                                    <FaHeart size={10} className={reply.isLiked ? 'fill-current' : 'stroke-2'} />
                                                                    {reply.likesCount > 0 && <span className="text-[10px]">{reply.likesCount}</span>}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-center pt-2 gap-1">
                                        <button
                                            onClick={() => onLikeComment(comment.id)}
                                            className={`transition-all hover:scale-110 active:scale-95 ${comment.isLiked ? 'text-red-500' : 'text-gray-300 hover:text-gray-500'}`}
                                        >
                                            <FaHeart size={14} className={comment.isLiked ? 'fill-current' : ''} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Input Section */}
            <div className="bg-white px-5 py-4 border-t border-gray-100 shrink-0 mb-safe">
                {replyingTo && (
                    <div className="flex items-center justify-between mb-2 px-2 text-xs text-gray-500 font-medium bg-gray-50 py-1.5 rounded-lg animate-fade-in">
                        <span>Replying to <span className="text-gray-900 font-bold">@{replyingTo.username}</span></span>
                        <button onClick={() => { setReplyingTo(null); setCommentText(''); }} className="hover:text-gray-900 p-1">
                            <FaTimes size={12} />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden text-[11px] font-bold text-gray-500 select-none">
                        {isLoggedIn && currentUserAvatar ? (
                            <img
                                src={getAppUrl(currentUserAvatar)}
                                className="w-full h-full object-cover"
                                alt="You"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${currentUsername || 'User'}&background=random`;
                                }}
                            />
                        ) : (
                            "YO"
                        )}
                    </div>

                    <div className="flex-1 flex items-center bg-[#f1f1f1] rounded-[24px] px-4 py-2.5 transition-all focus-within:bg-gray-100">
                        <input
                            type="text"
                            placeholder={replyingTo ? "" : "Add a comment..."}
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSend()}
                            className="flex-1 bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-gray-500 min-w-0"
                        />
                        {commentText.trim() ? (
                            <button
                                onClick={handleSend}
                                className="text-blue-500 font-bold text-sm hover:text-blue-600 transition-colors ml-2"
                            >
                                Post
                            </button>
                        ) : (
                            <button
                                className="text-gray-500 hover:text-gray-700 transition-colors p-1 ml-1"
                            >
                                <FaSmile size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReelCommentSection;
