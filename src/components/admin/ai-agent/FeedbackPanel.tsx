import React, { useState } from 'react';

export function FeedbackPanel({ onSubmit, loading }: { onSubmit: (rating: number, comment: string) => void; loading: boolean }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(rating, comment);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl text-center">
        <p className="text-xs text-emerald-800 font-medium">سپاس! بازخورد شما با موفقیت ثبت شد.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-right space-y-3">
      <h4 className="text-sm font-bold text-gray-800">ثبت بازخورد برای این پیشنهاد</h4>
      <div className="flex gap-1 justify-end">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setRating(star)}
            className={`text-lg transition ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="نظرات یا پیشنهادات شما..."
        className="w-full text-right p-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:outline-none"
        rows={2}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-1.5 text-xs text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition font-semibold"
      >
        {loading ? 'در حال ارسال...' : 'ارسال بازخورد'}
      </button>
    </form>
  );
}
