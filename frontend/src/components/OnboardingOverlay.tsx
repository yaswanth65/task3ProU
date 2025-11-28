import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Button from "./ui/Button";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

interface OnboardingOverlayProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to TaskFlow!",
    description:
      "Your all-in-one task management solution. Let's take a quick tour of the main features.",
    icon: CheckCircleIcon,
    image: "/onboarding-welcome.svg",
  },
  {
    title: "Manage Tasks",
    description:
      "Create, organize, and track tasks with ease. Use the Kanban board for visual workflow management.",
    icon: ClipboardDocumentListIcon,
    image: "/onboarding-tasks.svg",
  },
  {
    title: "Calendar View",
    description:
      "See all your tasks and deadlines in a calendar view. Never miss an important due date.",
    icon: CalendarIcon,
    image: "/onboarding-calendar.svg",
  },
  {
    title: "Team Messaging",
    description:
      "Communicate with your team in real-time. Get instant updates and notifications.",
    icon: ChatBubbleLeftRightIcon,
    image: "/onboarding-messages.svg",
  },
  {
    title: "Reports & Insights",
    description:
      "Track team performance and productivity with detailed analytics and reports.",
    icon: ChartBarIcon,
    image: "/onboarding-reports.svg",
  },
];

export default function OnboardingOverlay({
  onComplete,
}: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { updateUser } = useAuthStore();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      await api.put("/users/me", { onboardingCompleted: true });
      updateUser({ onboardingCompleted: true });
    } catch (error) {
      console.error("Failed to update onboarding status:", error);
    }
    onComplete();
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="gradient-primary p-8 text-white text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4"
              >
                <Icon className="w-8 h-8" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
              <p className="text-white/90">{step.description}</p>
            </div>

            {/* Illustration placeholder */}
            <div className="p-8">
              <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                <Icon className="w-24 h-24 text-slate-300" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="px-8 pb-8">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "w-6 bg-primary-600"
                    : index < currentStep
                    ? "bg-primary-400"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleSkip}>
              Skip tour
            </Button>
            <Button
              onClick={handleNext}
              rightIcon={<ArrowRightIcon className="w-4 h-4" />}
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
