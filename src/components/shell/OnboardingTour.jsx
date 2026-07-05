import { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices } from "../../stores/usePageApi.js";
import { useBodyScrollLock } from "./useBodyScrollLock.js";

const ONBOARD_STORAGE_PREFIX = "quantgym.ui.onboarded.v1";

const ONBOARD_STEPS = [
  {
    img: "/assets/generated/playful-precision/mascot-hero-v5-clean.png",
    kicker: "WELCOME TO QUANTGYM",
    titleKey: "tourStep1Title",
    subKey: "tourStep1Sub",
    ctaKey: "tourNext"
  },
  {
    img: "/assets/generated/playful-precision/mascot-teacher-v2.png",
    kicker: "MODULE NAVIGATION",
    titleKey: "tourStep2Title",
    subKey: "tourStep2Sub",
    ctaKey: "tourNext"
  },
  {
    img: "/assets/generated/playful-precision/mascot-search.png",
    kicker: "COMMAND PALETTE",
    titleKey: "tourStep3Title",
    subKey: "tourStep3Sub",
    ctaKey: "tourStep3Cta"
  }
];

function onboardStorageKey(userId = "") {
  return `${ONBOARD_STORAGE_PREFIX}:${userId || "anonymous"}`;
}

function hasOnboarded(userId) {
  try {
    return Boolean(globalThis.localStorage?.getItem(onboardStorageKey(userId)));
  } catch {
    return true;
  }
}

function markOnboarded(userId) {
  try {
    globalThis.localStorage?.setItem(onboardStorageKey(userId), "1");
  } catch {}
}

export function OnboardingTour() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const appServices = useAppServices();
  const t = appServices?.t || ((key) => key);
  const userId = currentUser?.id || "";
  const [step, setStep] = useState(-1);
  const open = step >= 0;

  useBodyScrollLock(open);

  useEffect(() => {
    if (!currentUser) {
      setStep(-1);
      return;
    }
    setStep(hasOnboarded(userId) ? -1 : 0);
  }, [currentUser, userId]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => globalThis.lucide?.createIcons?.());
  }, [open, step]);

  if (!open) return null;

  const boundedStep = Math.min(step, ONBOARD_STEPS.length - 1);
  const current = ONBOARD_STEPS[boundedStep];

  const finish = () => {
    markOnboarded(userId);
    setStep(-1);
  };

  const next = () => {
    if (boundedStep >= ONBOARD_STEPS.length - 1) {
      finish();
      return;
    }
    setStep(boundedStep + 1);
  };

  return (
    <div className="qg-onboard" role="presentation">
      <div className="qg-onboard-card" role="dialog" aria-modal="true" aria-label={t("tourAria")}>
        <button className="qg-onboard-skip" type="button" onClick={finish}>{t("tourSkip")}</button>
        <div className="qg-onboard-art" aria-hidden="true">
          <img src={current.img} alt="" decoding="async" />
        </div>
        <div className="qg-onboard-kicker">{current.kicker}</div>
        <div className="qg-onboard-title">{t(current.titleKey)}</div>
        <div className="qg-onboard-sub">{t(current.subKey)}</div>
        <div className="qg-onboard-dots" aria-hidden="true">
          {ONBOARD_STEPS.map((item, index) => (
            <span
              className={index === boundedStep ? "qg-onboard-dot is-active" : "qg-onboard-dot"}
              key={item.kicker}
            ></span>
          ))}
        </div>
        <button className="qg-onboard-cta" type="button" onClick={next}>{t(current.ctaKey)}</button>
      </div>
    </div>
  );
}
