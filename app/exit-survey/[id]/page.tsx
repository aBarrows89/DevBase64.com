"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const REASON_OPTIONS = [
  "Better opportunity elsewhere",
  "Higher compensation",
  "Career advancement",
  "Relocation",
  "Family/personal reasons",
  "Work-life balance",
  "Management issues",
  "Company culture",
  "Lack of growth opportunities",
  "Job duties changed",
  "Retirement",
  "Health reasons",
  "Going back to school",
  "Starting own business",
  "Contract ended",
  "Other",
];

export default function ExitSurveyPage() {
  const params = useParams();
  const interviewId = params.id as string;

  const interview = useQuery(api.exitInterviews.getById, {
    interviewId: interviewId,
  });
  const submitSurvey = useMutation(api.exitInterviews.submitSelfService);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [responses, setResponses] = useState({
    primaryReason: "",
    satisfactionRating: 0,
    managementRating: 0,
    workLifeBalanceRating: 0,
    compensationRating: 0,
    growthOpportunityRating: 0,
    wouldReturn: "",
    wouldRecommend: "",
    whatLikedMost: "",
    whatCouldImprove: "",
    additionalComments: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await submitSurvey({
        interviewId: interviewId as Id<"exitInterviews">,
        responses: {
          primaryReason: responses.primaryReason || undefined,
          satisfactionRating: responses.satisfactionRating || undefined,
          managementRating: responses.managementRating || undefined,
          workLifeBalanceRating: responses.workLifeBalanceRating || undefined,
          compensationRating: responses.compensationRating || undefined,
          growthOpportunityRating: responses.growthOpportunityRating || undefined,
          wouldReturn: responses.wouldReturn || undefined,
          wouldRecommend: responses.wouldRecommend || undefined,
          whatLikedMost: responses.whatLikedMost || undefined,
          whatCouldImprove: responses.whatCouldImprove || undefined,
          additionalComments: responses.additionalComments || undefined,
        },
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit survey";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const RatingInput = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (val: number) => void;
  }) => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`w-12 h-12 rounded-lg text-lg font-semibold transition-all ${
              value === num
                ? "bg-[#1C3F60] text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {num}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  );

  // Loading state
  if (interview === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C3F60] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (interview === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Survey Not Found</h1>
          <p className="text-gray-600">
            This exit survey link is invalid or has expired. Please contact HR if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Already completed
  if (interview.status === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Submitted</h1>
          <p className="text-gray-600">
            This exit survey has already been completed. Thank you for your feedback.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-4">
            Your feedback has been submitted successfully. We appreciate you taking the time to share your thoughts with us.
          </p>
          <p className="text-sm text-gray-500">
            Your input helps us improve the workplace for current and future team members.
          </p>
        </div>
      </div>
    );
  }

  // Survey form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-[#1C3F60] rounded-t-2xl p-6 text-white">
          <h1 className="text-2xl font-bold">Exit Interview Survey</h1>
          <p className="text-blue-100 mt-1">IE Central</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-b-2xl shadow-xl p-6 md:p-8">
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-gray-600">
              Hi <span className="font-semibold">{interview.personnelName}</span>,
            </p>
            <p className="text-gray-600 mt-2">
              We value your feedback as you transition from your role. Your honest responses will help us improve the workplace for our team members. All responses are confidential.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Primary Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What is your primary reason for leaving?
            </label>
            <select
              value={responses.primaryReason}
              onChange={(e) => setResponses((prev) => ({ ...prev, primaryReason: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C3F60] focus:border-transparent"
            >
              <option value="">Select a reason...</option>
              {REASON_OPTIONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Ratings Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rate your experience (1 = Poor, 5 = Excellent)
            </h3>

            <RatingInput
              label="Overall job satisfaction"
              value={responses.satisfactionRating}
              onChange={(val) => setResponses((prev) => ({ ...prev, satisfactionRating: val }))}
            />

            <RatingInput
              label="Quality of management/supervision"
              value={responses.managementRating}
              onChange={(val) => setResponses((prev) => ({ ...prev, managementRating: val }))}
            />

            <RatingInput
              label="Work-life balance"
              value={responses.workLifeBalanceRating}
              onChange={(val) => setResponses((prev) => ({ ...prev, workLifeBalanceRating: val }))}
            />

            <RatingInput
              label="Compensation and benefits"
              value={responses.compensationRating}
              onChange={(val) => setResponses((prev) => ({ ...prev, compensationRating: val }))}
            />

            <RatingInput
              label="Growth and advancement opportunities"
              value={responses.growthOpportunityRating}
              onChange={(val) => setResponses((prev) => ({ ...prev, growthOpportunityRating: val }))}
            />
          </div>

          {/* Would Return/Recommend */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Would you consider returning in the future?
              </label>
              <div className="flex gap-2">
                {["yes", "maybe", "no"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setResponses((prev) => ({ ...prev, wouldReturn: option }))}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize ${
                      responses.wouldReturn === option
                        ? "bg-[#1C3F60] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Would you recommend us as an employer?
              </label>
              <div className="flex gap-2">
                {["yes", "maybe", "no"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setResponses((prev) => ({ ...prev, wouldRecommend: option }))}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize ${
                      responses.wouldRecommend === option
                        ? "bg-[#1C3F60] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Open-ended Questions */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What did you like most about working here?
              </label>
              <textarea
                value={responses.whatLikedMost}
                onChange={(e) => setResponses((prev) => ({ ...prev, whatLikedMost: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C3F60] focus:border-transparent"
                placeholder="Your response..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What could we improve as an employer?
              </label>
              <textarea
                value={responses.whatCouldImprove}
                onChange={(e) => setResponses((prev) => ({ ...prev, whatCouldImprove: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C3F60] focus:border-transparent"
                placeholder="Your response..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Any additional comments or feedback?
              </label>
              <textarea
                value={responses.additionalComments}
                onChange={(e) => setResponses((prev) => ({ ...prev, additionalComments: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C3F60] focus:border-transparent"
                placeholder="Your response..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-4 px-6 rounded-lg text-white font-semibold text-lg transition-all ${
              submitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#1C3F60] hover:bg-[#2C5F80] shadow-lg hover:shadow-xl"
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </span>
            ) : (
              "Submit Feedback"
            )}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Your responses are confidential and will only be used to improve our workplace.
          </p>
        </form>
      </div>
    </div>
  );
}
