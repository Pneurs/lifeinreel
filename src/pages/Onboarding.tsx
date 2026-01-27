import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Camera, Film } from 'lucide-react';
import { IOSButton } from '@/components/ui/ios-button';
import onboardingBg from '@/assets/onboarding-bg.jpg';
import { cn } from '@/lib/utils';

const slides = [
  {
    icon: Sparkles,
    title: 'Every moment matters',
    description: 'Capture 1–2 second clips daily and watch your journey unfold into something beautiful.',
  },
  {
    icon: Camera,
    title: 'Simple daily ritual',
    description: "Just one quick clip a day. That's all it takes to document life's precious moments.",
  },
  {
    icon: Film,
    title: 'Stories come alive',
    description: 'Weekly, monthly, and yearly videos are created automatically from your highlights.',
  },
];

const Onboarding: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate('/home');
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen max-w-md mx-auto relative overflow-hidden">
      {/* Background */}
      <img
        src={onboardingBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen px-8 pt-20 pb-12">
        {/* Skip button */}
        <button
          onClick={() => navigate('/home')}
          className="self-end text-sm text-muted-foreground font-medium"
        >
          Skip
        </button>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8">
            <Icon className="w-12 h-12 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {slide.title}
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-xs leading-relaxed">
            {slide.description}
          </p>
        </div>

        {/* Dots and button */}
        <div className="space-y-8">
          {/* Dots */}
          <div className="flex justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  index === currentSlide
                    ? 'w-8 bg-primary'
                    : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>

          {/* Button */}
          <IOSButton
            onClick={handleNext}
            variant="primary"
            size="lg"
            fullWidth
          >
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Continue'}
          </IOSButton>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
