import React, { useState, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Sparkles, Camera, Film } from 'lucide-react';
import { IOSButton } from '@/components/ui/ios-button';
import onboardingBg from '@/assets/onboarding-bg.jpg';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';
import { useAuth } from '@/contexts/AuthContext';

type Slide = {
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  subheadline: string;
  body: string[];
  cta: string;
  footnote: string;
  emotional?: string[];
};

const slides: Slide[] = [
  {
    icon: Sparkles,
    headline: 'Most People Forget 90% of Their Year.',
    subheadline: "The best moments aren't planned.\nThey're lived.",
    body: [
      'Capture 4 seconds a day.',
      'At the end of the month, relive everything in one beautiful reel.',
    ],
    cta: 'Start Before This Month Ends',
    footnote: 'Your future self will thank you.',
  },
  {
    icon: Film,
    headline: 'Turn Everyday Moments Into Timeless Films',
    subheadline: 'Your life deserves more than disappearing stories.',
    body: [
      'Record 4 seconds daily.',
      'We craft your monthly memory movie — with music, emotion, and magic.',
    ],
    cta: 'Unlock My Memory Film',
    footnote: 'Private. Secure. Yours forever.',
  },
  {
    icon: Camera,
    headline: "Your Life Is Happening. Don't Let It Disappear.",
    subheadline: 'Record just 4 seconds a day.\nWe turn it into a beautiful monthly memory film — automatically.',
    body: [],
    emotional: [
      'One day your baby will grow up.',
      'That trip will become a memory.',
      'That moment will never come back.',
      'But this time… you kept it.',
    ],
    cta: 'Start My Memory Journey',
    footnote: '',
  },
];

const Onboarding: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  if (loading) return null;
  if (user) return <Navigate to="/home" replace />;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      emblaApi?.scrollNext();
    } else {
      navigate('/home');
    }
  };

  const goToSlide = (index: number) => {
    emblaApi?.scrollTo(index);
  };

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

        {/* Swipeable slides */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div ref={emblaRef} className="overflow-hidden w-full">
            <div className="flex">
              {slides.map((slide, index) => {
                const Icon = slide.icon;
                return (
                  <div key={index} className="min-w-0 shrink-0 grow-0 basis-full">
                    <div className="flex flex-col items-center justify-center text-center px-2">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                        <Icon className="w-10 h-10 text-primary" />
                      </div>
                      <h1 className="text-[26px] leading-tight font-bold text-foreground mb-4 max-w-xs">
                        {slide.headline}
                      </h1>
                      <p className="text-base text-muted-foreground max-w-xs leading-relaxed whitespace-pre-line mb-4">
                        {slide.subheadline}
                      </p>
                      {slide.body.length > 0 && (
                        <div className="space-y-1 max-w-xs mb-4">
                          {slide.body.map((line, i) => (
                            <p key={i} className="text-sm text-foreground/80 leading-relaxed">
                              {line}
                            </p>
                          ))}
                        </div>
                      )}
                      {slide.emotional && (
                        <div className="space-y-2 max-w-xs mt-2 font-[Caveat,cursive] text-xl text-foreground/90">
                          {slide.emotional.map((line, i) => (
                            <p key={i} className="leading-snug">
                              {line}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dots and button */}
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  index === currentSlide
                    ? 'w-8 bg-primary'
                    : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>

          <IOSButton
            onClick={handleNext}
            variant="primary"
            size="lg"
            fullWidth
          >
            {slides[currentSlide].cta}
          </IOSButton>

          {slides[currentSlide].footnote && (
            <p className="text-center text-xs text-muted-foreground">
              {slides[currentSlide].footnote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
