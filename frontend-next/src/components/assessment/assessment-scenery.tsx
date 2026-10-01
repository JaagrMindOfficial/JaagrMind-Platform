"use client";

import { useState, useEffect } from "react";
import { AssessmentThemeId, useAssessmentTheme } from "@/lib/assessment-theme";
import { CrayonScenery } from "./crayon-scenery";

interface AssessmentSceneryProps {
  themeId: AssessmentThemeId;
  questionIndex?: number;
  totalQuestions?: number;
  selectedAnswer?: any;
  isCompleted?: boolean;
}

export function AssessmentScenery({
  themeId,
  questionIndex,
}: AssessmentSceneryProps) {
  const { theme } = useAssessmentTheme(themeId);

  // Dynamic card-edge tracking for JM Serene:
  // Dynamically measures the active card's bounding box and anchors the wave
  // directly onto the card's left border across all steps with zero gap.
  const [cardMetrics, setCardMetrics] = useState<{
    left: number;
    top: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (theme.id !== "jm-serene") return;

    const updateMetrics = () => {
      const card =
        (document.querySelector('[data-assessment-card="true"]') as HTMLElement) ||
        (document.querySelector('[data-assessment-main-card="true"]') as HTMLElement) ||
        (document.querySelector('#assessment-main-card') as HTMLElement) ||
        (document.querySelector('#assessment-instructions-card') as HTMLElement) ||
        (document.querySelector('[role="radiogroup"]')?.closest('.rounded-2xl, .rounded-3xl, .border') as HTMLElement);

      if (card) {
        const rect = card.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCardMetrics({
            left: rect.left,
            top: rect.top + window.scrollY,
            height: rect.height,
          });
        }
      }
    };

    updateMetrics();

    const t1 = setTimeout(updateMetrics, 50);
    const t2 = setTimeout(updateMetrics, 200);
    const t3 = setTimeout(updateMetrics, 500);

    window.addEventListener("resize", updateMetrics);
    window.addEventListener("scroll", updateMetrics);

    const observer = new MutationObserver(updateMetrics);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", updateMetrics);
      window.removeEventListener("scroll", updateMetrics);
      observer.disconnect();
    };
  }, [theme.id, questionIndex]);

  // Computed layout for JM Serene foliage and wave:
  // - waveWidth stretches from left (-30px) to touch the card border (cardMetrics.left + 31.5px)
  // - waveTop positions the wave's peak to touch the card along its lower half
  // - botanical illustration sits above the wave, with its stem meeting the wave's peak
  const cardLeft = cardMetrics?.left;
  const cardTop = cardMetrics?.top;
  const cardHeight = cardMetrics?.height || 460;

  const sereneWaveWidth = cardLeft !== undefined ? Math.max(180, cardLeft + 31.5) : "calc(50vw - 336px + 31.5px)";
  const sereneWaveTop = cardTop !== undefined ? cardTop + Math.max(120, Math.min(230, cardHeight * 0.42)) : 371;
  const sereneBotanicalTop = cardTop !== undefined ? Math.max(70, sereneWaveTop - 214) : 157;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Soothing warm ambient background matching reference */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{ backgroundColor: theme.bgPage || "#FAF8F5" }}
      />

      {/* Dark Mode Twilight background */}
      <div className="hidden dark:block absolute inset-0 bg-[#0B0F17]" />

      {/* Corner Foliage & Organic SVGs (Rendered for JM Signature) */}
      {theme.id === "jm-signature" && (
        <>
          {/* ─────────────────────────────────────────────────────────────
              1. UPPER LEFT: Organic Lavender Blob & Mint Leaves
              Positioned 2-3 cursor gap below JM logo, width to red line mark
          ────────────────────────────────────────────────────────────── */}
          <div
            className="absolute left-[-20px] sm:left-[-25px] md:left-[-30px] top-[70px] sm:top-[80px] md:top-[85px] w-[180px] sm:w-[225px] md:w-[265px] h-[210px] sm:h-[265px] md:h-[315px] z-0 pointer-events-none select-none transition-all duration-300"
            style={{
              position: "absolute",
              flex: "none",
              order: 0,
              flexGrow: 0,
            }}
          >
            <svg
              viewBox="0 0 77 148"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              className="w-full h-full drop-shadow-xs"
            >
              <g clipPath="url(#jaagrmind-clip-bg)">
                {/* Mint Green Leaves Decoration */}
                <g clipPath="url(#jaagrmind-clip-leaves)">
                  <path
                    d="M65.5278 110.772C64.1333 111.295 62.2222 113.252 61.1055 115.103C60.1222 116.735 59.5278 118.454 59.8167 119.146C60.0167 119.623 60.6278 119.577 61.3611 119.21C63.0944 118.348 64.8833 116.222 65.6278 114.187C66.0722 112.968 66.1667 111.707 65.9278 111.029C65.85 110.804 65.7167 110.699 65.5278 110.772Z"
                    fill="#A9D3C7"
                  />
                  <path
                    d="M70.2778 110.002C69.6111 110.167 69.1944 110.758 69.1333 111.657C69 113.609 70.0389 116.382 71.4833 118.193C72.2666 119.173 73.2166 119.843 73.8166 119.769C74.3722 119.705 74.4722 118.976 74.1889 117.876C73.7222 116.075 72.5444 113.316 71.5444 111.57C71.0833 110.763 70.6333 110.094 70.2778 110.002Z"
                    fill="#A9D3C7"
                  />
                </g>

                {/* Lavender Organic Blobs & Contour Lines */}
                <path
                  d="M0 8.04348C14.7273 9.82906 26.7273 14.9307 36 24.3688C43.6364 32.0212 48.5455 38.6534 57.2727 43.755C64.9091 48.0914 69 53.4482 69 62.121C69 71.3039 64.0909 76.4056 54.5455 82.5276C43.3636 89.6699 31.6364 95.2817 21.5455 103.699C13.6364 110.332 7.63636 115.688 0 118.239V8.04348Z"
                  className="fill-[#EEECFF] dark:fill-[#312E81]/30"
                />
                <path
                  opacity="0.4"
                  d="M0 75.7903C11.5566 69.9538 23.9387 65.9132 34.945 67.26C45.401 68.6069 52.8302 74.4434 56.4073 83.1981C59.9843 92.1773 57.2328 102.952 51.1793 111.483C44.5755 120.686 34.1195 125.625 21.4623 128.094C13.7579 129.665 6.60378 129.89 0 129.665"
                  stroke="#9690D6"
                  strokeWidth="0.85"
                  className="dark:stroke-[#818CF8]"
                />
              </g>
              <defs>
                <clipPath id="jaagrmind-clip-bg">
                  <rect width="102" height="148" fill="white" transform="translate(-25)" />
                </clipPath>
                <clipPath id="jaagrmind-clip-leaves">
                  <rect width="20" height="22" fill="white" transform="translate(58 107)" />
                </clipPath>
              </defs>
            </svg>
          </div>

          {/* ─────────────────────────────────────────────────────────────
          2. LOWER LEFT: Organic Sage Shape with Mint Leaves
          Anchored to bottom-left corner, medium increase in length and thickness
      ────────────────────────────────────────────────────────────── */}
          <div
            className="absolute left-0 bottom-0 w-[155px] sm:w-[210px] md:w-[255px] lg:w-[275px] h-[175px] sm:h-[235px] md:h-[285px] lg:h-[305px] z-0 pointer-events-none select-none transition-all duration-300"
            style={{
              position: "absolute",
              flex: "none",
              order: 1,
              flexGrow: 0,
            }}
          >
            <svg
              viewBox="0 0 97 108"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-xs"
            >
              <g clipPath="url(#jaagrmind-clip-sage)">
                {/* Butter-yellow background curve */}
                <path
                  d="M48.9544 51.3829C56.207 50.3345 65.2728 51.3829 71.6189 55.0526C79.7781 59.7706 84.311 68.6826 84.7643 78.643C85.2176 88.0792 82.0445 96.4669 76.6051 102.758L69.3524 108H46.688C50.3143 98.5638 51.6741 89.6519 50.7676 80.7399C49.861 71.3038 47.1413 61.8676 45.3281 56.6253L48.9544 51.3829Z"
                  className="fill-[#FBFAE9] dark:fill-[#065F46]/20"
                />
                {/* Sage-green organic blob */}
                <path
                  d="M0 14.1561C9.06542 13.6319 16.771 15.2047 22.6636 20.9716C28.1028 26.2143 30.3692 34.0783 33.5421 42.4666C37.1682 51.9034 43.0608 57.1461 50.7664 62.3887C59.8318 68.6799 67.5374 73.9226 73.4299 81.7866C78.4159 88.6021 79.7757 96.9904 79.3225 104.33L78.8692 108H0V14.1561Z"
                  className="fill-[#E8EDD9] dark:fill-[#064E3B]/25"
                />
                {/* Mint contour line */}
                <path
                  opacity="0.5"
                  d="M0 49.2804C6.79924 52.4261 11.3321 57.1446 15.4116 63.9603C19.4911 71.3002 24.024 75.4945 30.8232 77.5916C37.6224 79.6888 43.9684 78.1159 50.3144 80.7373C57.1136 83.883 60.7398 90.1744 61.1931 98.0386C61.6464 101.709 60.7398 105.379 59.8333 108"
                  stroke="#9BBFB2"
                  strokeWidth="0.75"
                  strokeLinecap="round"
                  className="dark:stroke-[#34D399]/40"
                />
                {/* Two Sage Leaves pointing up */}
                <path
                  d="M37.3509 25.5289C35.672 23.8514 33.4032 21.1254 32.178 19.1333C31.3158 17.7179 31.5881 16.3025 32.7225 15.988C34.0384 15.621 35.5359 17.4558 36.398 19.3954C37.2148 21.3351 37.6686 23.6941 37.6232 25.2144C37.5778 25.4765 37.4871 25.5813 37.3509 25.5289Z"
                  fill="#8BB9A9"
                />
                <path
                  d="M41.2283 26.9156C40.6307 25.1281 41.2283 22.1315 42.7648 19.608C43.8746 17.7154 45.9233 15.7176 47.5452 16.0331C49.5086 16.4011 49.2525 18.6091 48.1428 20.7646C46.7769 23.3407 44.0453 25.9693 41.9112 27.1259C41.5697 27.2836 41.3136 27.1785 41.2283 26.9156Z"
                  fill="#8BB9A9"
                />
              </g>
              <defs>
                <clipPath id="jaagrmind-clip-sage">
                  <rect width="97" height="108" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>

          {/* ─────────────────────────────────────────────────────────────
          3. UPPER RIGHT: Organic Mint Shape with Three Radiating Leaves
          Anchored to top-right edge, matching left-up starting point and height
      ────────────────────────────────────────────────────────────── */}
          <div
            className="absolute right-0 top-[70px] sm:top-[80px] md:top-[85px] w-[150px] sm:w-[190px] md:w-[225px] h-[210px] sm:h-[265px] md:h-[315px] z-0 pointer-events-none select-none transition-all duration-300"
            style={{
              position: "absolute",
              flex: "none",
              order: 2,
              flexGrow: 0,
            }}
          >
            <svg
              viewBox="0 0 73 102"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-xs"
            >
              <g clipPath="url(#jaagrmind-clip-mint)">
                {/* Mint Organic Curve */}
                <path
                  d="M73 7.191C63.789 8.95263 56.4885 12.3368 50.1432 17.4826C41.8874 24.2046 36.4973 32.5491 34.3822 41.2182C32.0624 50.8144 33.6999 60.3643 39.8405 67.4108C46.3906 74.9209 57.4437 75.2454 73 75.2454V7.191Z"
                  className="fill-[#E1EFE9] dark:fill-[#064E3B]/25"
                />
                {/* Three Radiating Mint Leaves */}
                <path
                  d="M24.9112 55.5804C23.176 52.6266 19.2529 47.3902 16.386 44.9734C14.8771 43.6979 13.3682 43.6308 13.0664 45.0406C12.5383 47.1217 15.2543 50.2769 17.8194 52.4252C20.2337 54.5063 22.8742 55.6476 24.4585 55.9832C24.9112 56.0503 25.1375 55.9161 24.9112 55.5804Z"
                  fill="#A8D2C6"
                />
                <path
                  d="M23.7469 60.3821C21.0999 58.9162 16.7115 56.9616 13.5073 56.2287C11.0693 55.6586 9.39751 56.1472 9.04922 57.776C8.63128 59.812 10.93 61.0336 13.8556 61.6037C17.1991 62.2552 21.3786 62.0924 23.6772 61.1965C24.0952 61.0336 24.0952 60.6264 23.7469 60.3821Z"
                  fill="#A8D2C6"
                />
                <path
                  d="M26.095 64.0661C23.2579 65.4487 18.4074 68.0296 15.4788 70.4261C13.2823 72.1774 12.3671 73.8365 13.4654 74.6661C14.9297 75.7722 17.6753 73.9287 20.2378 72.0852C23.2579 69.8731 25.912 66.9235 26.9187 64.9879C27.1933 64.4348 26.7357 63.7896 26.095 64.0661Z"
                  fill="#A8D2C6"
                />
              </g>
              <defs>
                <clipPath id="jaagrmind-clip-mint">
                  <rect width="73" height="102" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>

          {/* ─────────────────────────────────────────────────────────────
          4. LOWER RIGHT: Organic Lavender Arc Shape with Purple Petals
          Anchored to bottom-right corner, matching left-down width & height
      ────────────────────────────────────────────────────────────── */}
          <div
            className="absolute right-0 bottom-0 w-[155px] sm:w-[210px] md:w-[255px] lg:w-[275px] h-[175px] sm:h-[235px] md:h-[285px] lg:h-[305px] z-0 pointer-events-none select-none transition-all duration-300"
            style={{
              position: "absolute",
              flex: "none",
              order: 3,
              flexGrow: 0,
            }}
          >
            <svg
              viewBox="0 0 107 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-xs"
            >
              <g clipPath="url(#jaagrmind-clip-lavender-arc)">
                {/* Lavender Arc Blob */}
                <path
                  d="M24.9018 142C25.6226 124.127 29.6201 107.05 38.2703 91.87C47.838 75.0376 61.8619 62.3062 79.4245 54.4102C100.395 44.9229 125.69 44.7392 154 45.7186V142H24.9018Z"
                  className="fill-[#ECEBFA] dark:fill-[#4338CA]/25"
                />
                {/* Purple Contour Line */}
                <path
                  opacity="0.5"
                  d="M28.2353 134.345C24.1723 120.022 24.0412 106.312 27.2523 93.4586C31.3154 77.1164 40.4899 63.0388 54.0552 51.2871C69.2588 38.1277 88.7875 29.4975 109.234 24.7234C126.141 20.8061 143.769 19.888 161.398 20.0104"
                  stroke="#8C8EDB"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  className="dark:stroke-[#A5B4FC]/40"
                />
                {/* Two Purple Petals */}
                <path
                  d="M57.0647 36.1466C55.2154 32.8041 52.2725 26.2309 51.224 22.889C50.5782 20.8122 51.2342 20.041 53.0485 20.6469C55.3769 21.3964 56.4319 24.1576 57.1774 27.1175C57.9841 30.4911 58.2477 34.3575 57.8881 36.0915C57.8284 36.521 57.345 36.5843 57.0647 36.1466Z"
                  fill="#C7C5F4"
                />
                <path
                  d="M54.1044 38.0914C51.1551 38.275 46.4363 37.7854 43.9458 36.8062C42.3073 36.1941 41.5208 35.2149 42.3073 34.2357C43.2904 33.0728 45.5187 33.5625 47.8781 34.4805C50.4997 35.5209 53.0558 36.9286 54.301 37.6018C54.6942 37.8466 54.5632 38.0914 54.1044 38.0914Z"
                  fill="#C7C5F4"
                />
              </g>
              <defs>
                <clipPath id="jaagrmind-clip-lavender-arc">
                  <rect width="154" height="142" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          JM SERENE: Left Side Foliage & Organic Sage Wave
          - Botanical sage illustration sprouting above the wave
          - Organic sage wave extending to touch every active assessment card
      ────────────────────────────────────────────────────────────── */}
      {theme.id === "jm-serene" && (
        <>
          {/* Botanical Sage Illustration */}
          <div
            className="absolute hidden md:block z-10 pointer-events-none select-none transition-all duration-300"
            style={{
              position: "absolute",
              width: "180px",
              height: "220px",
              left: "-12px",
              top: `${sereneBotanicalTop}px`,
              transform: "rotate(10deg)",
              transformOrigin: "center",
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 204 248"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full overflow-visible"
            >
              <g clipPath="url(#clip0_9_24)">
                <path
                  d="M-3.77423 216.077C11.514 181.202 25.1229 150.093 38.3844 120.953C50.4875 92.6242 58.9987 61.6313 60.2689 31.3925"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M39.5429 120.142C33.979 99.8676 29.5735 78.7822 24.7041 54.5688"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M41.2223 116.376C54.4863 104.499 71.6894 93.3164 90.1677 86.4203"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M29.5831 147.833C45.1639 134.333 63.3519 123.324 83.6261 117.761"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20.0276 167.472C34.1027 156.753 49.2792 151.306 66.7155 150.319"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M43.0754 111.626C46.8385 96.0425 52.3977 81.7913 59.7528 68.8723"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M38.2108 121.938C29.4071 131.555 22.3992 142.504 17.1874 154.786"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M60.2689 31.3925C61.2561 48.8288 61.7795 63.137 60.3332 77.098"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M24.7041 54.5688C33.7434 72.4095 38.9601 94.6533 41.0487 117.361"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M90.1676 86.4203C73.0215 91.5204 57.1504 100.907 42.9016 112.611"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M83.6261 117.761C65.5523 116.604 50.5494 121.067 36.6479 130.801"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M66.7156 150.319C51.5962 149.684 36.4197 155.131 21.3597 165.676"
                  stroke="#78906F"
                  strokeWidth="1.05"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M52.4548 75.7088C43.3584 63.9506 39.2431 46.9782 46.5959 16.7964C62.643 23.6877 70.6975 41.3547 66.9343 56.938C65.3715 65.8013 60.0431 72.9851 52.4548 75.7088Z"
                  fill="#AFC1A4"
                />
                <path
                  d="M39.8902 118.172C27.1447 109.832 18.5693 95.1196 17.9294 75.7136C16.7114 65.3446 19.2591 56.655 25.0513 52.5992C37.6231 61.9239 44.6928 79.4173 45.8537 95.8688C46.2605 105.079 43.8865 112.784 39.8902 118.172Z"
                  fill="#AFC1A4"
                />
                <path
                  d="M51.8792 102.008C59.0607 90.0742 71.8037 81.1514 86.6329 77.6736C91.9042 76.5723 95.8434 77.2668 98.4506 79.7574C92.0803 92.8501 80.3221 101.947 66.4777 105.598C60.2215 106.526 55.2975 105.657 51.8792 102.008Z"
                  fill="#AFC1A4"
                />
                <path
                  d="M37.8064 129.99C46.7838 119.388 60.9755 113.767 76.4422 112.432C82.5247 112.489 87.2751 114.342 90.6934 117.991C81.716 128.593 68.5091 134.388 54.2008 134.911C47.1335 134.681 41.2247 133.639 37.8064 129.99Z"
                  fill="#AFC1A4"
                />
                <path
                  d="M17.6512 157.914C11.5092 146.677 9.01626 132.021 12.2585 119.392C14.4588 112.672 18.2815 108.269 22.568 106.994C30.8533 117.594 34.5047 131.439 32.4209 143.256C30.2206 149.976 25.2394 155.19 17.6512 157.914Z"
                  fill="#AFC1A4"
                />
                <path
                  d="M21.3598 165.676C29.5261 153.915 42.7329 148.121 57.2148 146.613C63.2973 146.67 69.0325 148.696 72.4508 152.345C64.6318 162.136 52.4098 168.105 39.0863 168.802C31.8454 169.556 25.9365 168.514 21.3598 165.676Z"
                  fill="#AFC1A4"
                />
              </g>
              <defs>
                <clipPath id="clip0_9_24">
                  <rect width="180" height="220" fill="white" transform="translate(26.2026) rotate(10)" />
                </clipPath>
              </defs>
            </svg>
          </div>

          {/* Organic Sage Wave (Touches every card seamlessly) */}
          <div
            className="absolute hidden md:block z-0 pointer-events-none select-none transition-all duration-300"
            style={{
              position: "absolute",
              left: "-30px",
              top: `${sereneWaveTop}px`,
              width: typeof sereneWaveWidth === "number" ? `${sereneWaveWidth}px` : sereneWaveWidth,
              minWidth: "220px",
              maxWidth: "680px",
              height: "353px",
              opacity: 0.9,
            }}
          >
            <svg
              viewBox="0 0 240 353"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              className="w-full h-full drop-shadow-xs overflow-visible"
            >
              {/* Base Wave Shape */}
              <path
                opacity="0.9"
                d="M-30 0C14 8.23278 46 38.0766 62 90.5605C81 152.306 107 177.005 154 182.15C197 186.267 217 214.053 240 254.188V336.516C185 360.185 130 359.155 79 328.282C21 293.293 -15 241.838 -30 191.412V0Z"
                fill="#D7DFD0"
                className="dark:fill-[#2B3A2E]/70"
              />


            </svg>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              JM SERENE: Upper Right Botanical Accent
              Positioned in the upper right, leaving space in line with the JaagrMind logo
          ────────────────────────────────────────────────────────────── */}
          <div
            className="absolute hidden md:block right-0 top-[70px] sm:top-[75px] md:top-[80px] w-[145px] sm:w-[165px] md:w-[185px] h-[310px] sm:h-[340px] md:h-[360px] max-h-[46vh] z-0 pointer-events-none select-none transition-all duration-300"
            style={{
              position: "absolute",
              right: 0,
            }}
          >
            <svg
              viewBox="0 0 136 330"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-xs overflow-visible"
            >
              <rect width="136" height="330" fill="currentColor" className="text-[#FBF9F2] dark:text-transparent" />
              <path
                d="M135.5 13.5 C108 31.5 82 54 68.5 82 C55 110 56.5 139 66.5 163 C79 193 105 220 135.5 242.5"
                fill="none"
                stroke="#819878"
                strokeWidth="1.05"
                strokeLinecap="round"
                className="dark:stroke-[#6E8F66]"
              />
              <path
                d="M135.5 164.5 C116 164.5 96 169.5 77 180 C47 196.5 22 221.5 13 249 C4 276.5 14 305 34 321 C39.5 325.5 46 328.5 52 330 L135.5 330 Z"
                fill="#FBE8D9"
                className="dark:fill-[#E0A96D]/20"
              />
              <path
                d="M23 129 C27.5 128.5 34 134 39 140.5 C42.5 145 45.5 151 45 154.5 C41 156.5 35 152.5 30 148 C25 143.5 21 135 23 129 Z"
                fill="#819878"
                className="dark:fill-[#6E8F66]"
              />
              <path
                d="M0 163 C8 159.5 17 159 26 160.5 C31 161.5 36 163.5 37.5 166.5 C35 170.5 27 173 18.5 174 C10.5 175 3.5 173.5 0 171.5 Z"
                fill="#AABBA0"
                className="dark:fill-[#8FA885]"
              />
            </svg>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              JM SERENE: Bottom Right Botanical Accent
              Positioned in the bottom right corner with peach background shape and foliage
          ────────────────────────────────────────────────────────────── */}
          <div
            className="absolute hidden md:block right-0 bottom-0 w-[165px] sm:w-[190px] md:w-[215px] h-[280px] sm:h-[320px] md:h-[340px] max-h-[42vh] z-0 pointer-events-none select-none transition-all duration-300"
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
            }}
          >
            <svg
              viewBox="0 0 163 307"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-xs overflow-visible"
            >
              <rect width="163" height="307" fill="currentColor" className="text-[#FBF9F2] dark:text-transparent" />

              {/* Peach background shape */}
              <path
                d="M163 128 C139 129 113 134 91 146 C62 161 39 184 28 212 C16 241 24 272 40 296 C43 300 46 304 50 307 L163 307 Z"
                fill="#FBE0CD"
                className="dark:fill-[#E0A96D]/15"
              />

              {/* Plant stems */}
              <g fill="none" stroke="#879B7B" strokeWidth="1" strokeLinecap="round" className="dark:stroke-[#78906F]">
                <path d="M163 307 C151 265 140 221 130 178 C121 141 111 112 105 94" />
                <path d="M130 178 C130 155 138 139 155 130" />
                <path d="M130 178 C119 145 99 120 67 97" />
                <path d="M130 178 C127 157 129 137 135 119" />
                <path d="M130 222 C134 209 143 197 157 191" />
              </g>

              {/* Upper large leaf */}
              <path
                d="M65 27 C82 27 97 37 106 53 C114 67 116 83 112 96 C109 103 105 100 101 95 C87 77 75 51 65 27 Z"
                fill="#AFC2A5"
                className="dark:fill-[#8FA885]"
              />

              {/* Central large leaf */}
              <path
                d="M68 87 C84 89 99 100 110 114 C120 127 126 143 128 160 C117 155 106 145 96 134 C82 120 72 104 68 87 Z"
                fill="#AFC2A5"
                className="dark:fill-[#8FA885]"
              />

              {/* Small upper-right leaf */}
              <path
                d="M127 133 C127 115 132 98 141 85 C146 78 151 75 155 77 C158 94 154 111 146 123 C141 130 135 135 127 135 Z"
                fill="#AFC2A5"
                className="dark:fill-[#8FA885]"
              />

              {/* Right middle leaf */}
              <path
                d="M127 177 C133 161 144 147 155 139 C157 137 159 136 163 136 L163 163 C154 174 141 180 127 180 Z"
                fill="#AFC2A5"
                className="dark:fill-[#8FA885]"
              />

              {/* Lower leaf */}
              <path
                d="M132 226 C121 216 111 203 105 189 C100 178 98 165 102 158 C115 165 126 177 133 191 C138 202 139 215 132 226 Z"
                fill="#AFC2A5"
                className="dark:fill-[#8FA885]"
              />

              {/* Small right lower leaf */}
              <path
                d="M140 235 C143 220 151 207 163 199 L163 229 C157 233 149 235 140 235 Z"
                fill="#AFC2A5"
                className="dark:fill-[#8FA885]"
              />
            </svg>
          </div>
        </>
      )}

      {/* Crayon Theme Scenery */}
      {theme.id === "jm-crayon" && <CrayonScenery />}

      {/* Subtle soft ambient corner warmth (serene background glow for JM Signature) */}
      {theme.id === "jm-signature" && (
        <>
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 dark:opacity-10 bg-[#8B9CF7]" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-15 dark:opacity-10 bg-[#0B4F48]" />
        </>
      )}
    </div>
  );
}
