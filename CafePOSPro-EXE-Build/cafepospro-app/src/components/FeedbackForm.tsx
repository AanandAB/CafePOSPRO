import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface FeedbackFormProps {
  tableId?: string;
  orderId?: string;
  customerName?: string;
  onFeedbackSubmitted?: () => void;
}

export function FeedbackForm({
  tableId,
  orderId,
  customerName,
  onFeedbackSubmitted,
}: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState<
    "food" | "service" | "ambiance" | "overall" | "other"
  >("overall");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = useMutation(api.feedback.submitFeedback);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (comment.trim().length === 0) {
      toast.error("Please provide some feedback");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitFeedback({
        customerName: customerName || undefined,
        tableId: tableId as Id<"tables"> | undefined,
        orderId: orderId as Id<"orders"> | undefined,
        rating,
        comment,
        category,
      });

      toast.success("Thank you for your feedback!");
      setRating(0);
      setComment("");
      setCategory("overall");

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (error) {
      toast.error("Failed to submit feedback. Please try again.");
      console.error("Feedback submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        Share Your Experience
      </h3>
      <p className="text-gray-600 mb-6">
        We'd love to hear about your experience at our café. Your feedback helps
        us improve our service.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(e);
        }}
        className="space-y-6"
      >
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How would you rate your experience? *
          </label>
          <div className="flex justify-center space-x-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="text-3xl focus:outline-none transition-transform hover:scale-110"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <span
                  className={`${(hoverRating || rating) >= star ? "text-amber-500" : "text-gray-300"}`}
                >
                  ★
                </span>
              </button>
            ))}
          </div>
          <div className="text-center text-sm font-medium text-gray-700">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What is your feedback about?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: "food", label: "Food" },
              { value: "service", label: "Service" },
              { value: "ambiance", label: "Ambiance" },
              { value: "overall", label: "Overall" },
              { value: "other", label: "Other" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value as any)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  category === option.value
                    ? "bg-amber-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your feedback *
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="Tell us about your experience..."
          />
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 shadow-md"
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </form>
    </div>
  );
}
