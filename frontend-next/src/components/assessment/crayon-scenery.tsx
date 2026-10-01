"use client";

import { motion } from "framer-motion";

export function CrayonScenery() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Paper texture background */}
      <div className="absolute inset-0 bg-[#FAF7F0] dark:bg-[#101713] transition-colors duration-500" />

      {/* Subtle organic paper grain overlay */}
      <div 
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#3a4a3e 1px, transparent 1px), radial-gradient(#3a4a3e 1px, #FAF7F0 1px)`,
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 12px 12px",
        }}
      />

      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          {/* Crayon / colored-pencil rough stroke filter */}
          <filter id="crayon-rough" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          <filter id="crayon-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* Crayon hatching texture pattern for hill fills */}
          <pattern id="crayon-hatch-green" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#689E5F" strokeWidth="1.2" strokeOpacity="0.45" />
            <line x1="6" y1="0" x2="6" y2="12" stroke="#87B87E" strokeWidth="0.8" strokeOpacity="0.3" />
          </pattern>

          {/* Crayon cloud hatching pattern */}
          <pattern id="crayon-hatch-cloud" width="10" height="10" patternTransform="rotate(-30 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#7BAEDB" strokeWidth="1.2" strokeOpacity="0.4" />
          </pattern>

          {/* Crayon tree leaf hatching pattern */}
          <pattern id="crayon-hatch-leaf" width="8" height="8" patternTransform="rotate(60 0 0)" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2.5" fill="#4B8144" fillOpacity="0.35" />
          </pattern>
        </defs>
      </svg>

      {/* ─────────────────────────────────────────────────────────────
          1. TOP-LEFT: Fluffy Blue Crayon Cloud & Pink Heart
      ────────────────────────────────────────────────────────────── */}
      <div className="absolute left-[-15px] sm:left-4 md:left-8 top-12 sm:top-14 md:top-16 w-[170px] sm:w-[210px] md:w-[250px] h-[100px] sm:h-[125px] md:h-[145px] z-0">
        <svg viewBox="0 0 170 100" fill="none" className="w-full h-full drop-shadow-xs overflow-visible" filter="url(#crayon-rough)">
          {/* Cloud Hatching Fill */}
          <path
            d="M32 68 C18 68 8 58 8 44 C8 32 18 24 30 24 C34 14 46 6 60 6 C76 6 88 15 92 27 C104 25 116 33 118 45 C124 51 124 61 118 67 C114 71 106 73 100 73 L32 68 Z"
            fill="#C9E3FB"
            fillOpacity="0.55"
            className="dark:fill-[#2B4C6F]/40"
          />
          <path
            d="M32 68 C18 68 8 58 8 44 C8 32 18 24 30 24 C34 14 46 6 60 6 C76 6 88 15 92 27 C104 25 116 33 118 45 C124 51 124 61 118 67 C114 71 106 73 100 73 L32 68 Z"
            fill="url(#crayon-hatch-cloud)"
          />
          {/* Cloud Hand-drawn Wavy Outline */}
          <path
            d="M 28 66 C 14 66 6 56 6 44 C 6 30 18 22 30 22 C 34 12 47 4 62 4 C 79 4 91 14 95 26 C 108 24 120 32 122 45 C 128 51 128 62 121 68 C 117 72 108 74 100 74 L 28 66 Z"
            stroke="#659FD8"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:stroke-[#5D8EB9]"
          />
          {/* Subtle inner scribble loops */}
          <path
            d="M 24 45 C 32 38 48 38 56 46 M 64 35 C 72 28 88 32 94 42 M 45 52 C 55 48 70 50 82 54"
            stroke="#85B7E5"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Floating Pink Crayon Heart near tree */}
      <div className="absolute left-[135px] sm:left-[185px] md:left-[230px] top-[145px] sm:top-[165px] md:top-[185px] w-6 sm:w-8 h-6 sm:h-8 z-0">
        <svg viewBox="0 0 28 28" fill="none" className="w-full h-full rotate-[-12deg]" filter="url(#crayon-rough)">
          <path
            d="M14 24.5 C14 24.5 3 17 3 10 C3 6 6 3 10 3 C12.5 3 13.5 4.5 14 5.5 C14.5 4.5 15.5 3 18 3 C22 3 25 6 25 10 C25 17 14 24.5 14 24.5 Z"
            fill="#FCA5B8"
            fillOpacity="0.75"
            stroke="#F472B6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:fill-[#E06489]/50 dark:stroke-[#F472B6]"
          />
          {/* Inner heart scribble */}
          <path
            d="M8 9 C9 7 12 7 13 10 M15 10 C16 7 19 7 20 9 M9 13 C12 16 14 18 14 18"
            stroke="#EC4899"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP-RIGHT: Cheerful Smiling Sun, Cloud, Butterfly & Stars
      ────────────────────────────────────────────────────────────── */}
      {/* Smiling Crayon Sun */}
      <div className="absolute right-[-10px] sm:right-4 md:right-8 lg:right-12 top-2 sm:top-4 md:top-6 w-[180px] sm:w-[220px] md:w-[260px] lg:w-[290px] h-[180px] sm:h-[220px] md:h-[260px] lg:h-[290px] z-0">
        <svg viewBox="0 0 220 220" fill="none" className="w-full h-full overflow-visible" filter="url(#crayon-rough)">
          {/* Radiating Hand-Drawn Crayon Sunbeams */}
          <g strokeLinecap="round">
            {/* Top / Right / Left radiating rays matching screenshot */}
            <path d="M110 52 L110 24" stroke="#F5A623" strokeWidth="4" />
            <path d="M136 58 L152 34" stroke="#F8C846" strokeWidth="3.6" />
            <path d="M158 74 L184 56" stroke="#F5A623" strokeWidth="4" />
            <path d="M172 98 L202 88" stroke="#F8C846" strokeWidth="3.8" />
            <path d="M176 122 L206 122" stroke="#F5A623" strokeWidth="4.2" />
            <path d="M170 146 L198 156" stroke="#F8C846" strokeWidth="3.6" />
            <path d="M154 168 L176 190" stroke="#F5A623" strokeWidth="4" />
            <path d="M132 182 L144 208" stroke="#F8C846" strokeWidth="3.5" />
            <path d="M108 186 L106 214" stroke="#F5A623" strokeWidth="4" />
            <path d="M84 180 L70 204" stroke="#F8C846" strokeWidth="3.6" />
            <path d="M64 164 L42 182" stroke="#F5A623" strokeWidth="4" />
            <path d="M50 140 L22 148" stroke="#F8C846" strokeWidth="3.8" />
            <path d="M46 114 L18 110" stroke="#F5A623" strokeWidth="4" />
            <path d="M52 88 L26 76" stroke="#F8C846" strokeWidth="3.6" />
            <path d="M68 66 L48 46" stroke="#F5A623" strokeWidth="4" />
            <path d="M88 56 L76 30" stroke="#F8C846" strokeWidth="3.5" />
          </g>

          {/* Central Sun Circle with Crayon Scribble */}
          <circle
            cx="110"
            cy="118"
            r="44"
            fill="#FDE68A"
            fillOpacity="0.8"
            stroke="#F5A623"
            strokeWidth="3.5"
            className="dark:fill-[#F59E0B]/30 dark:stroke-[#FBBF24]"
          />
          {/* Inner warm crayon scribble rings */}
          <path
            d="M 85 110 C 90 92 130 92 135 110 C 138 126 125 142 108 142 C 94 142 85 130 92 118 C 96 110 115 110 120 118"
            stroke="#FBBF24"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />

          {/* Cute Smiling Face inside the Sun */}
          {/* Left Eye */}
          <circle cx="98" cy="112" r="3.2" fill="#78350F" className="dark:fill-[#FEF3C7]" />
          {/* Right Eye */}
          <circle cx="122" cy="112" r="3.2" fill="#78350F" className="dark:fill-[#FEF3C7]" />
          {/* Cheerful Smile Arc */}
          <path
            d="M 97 125 C 104 135 116 135 123 125"
            stroke="#78350F"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
            className="dark:stroke-[#FEF3C7]"
          />
          {/* Rosy Crayon Cheeks */}
          <ellipse cx="91" cy="122" rx="4" ry="2.5" fill="#FCA5A5" fillOpacity="0.6" />
          <ellipse cx="129" cy="122" rx="4" ry="2.5" fill="#FCA5A5" fillOpacity="0.6" />
        </svg>
      </div>

      {/* Top-Right Soft Blue Cloud */}
      <div className="absolute right-[-25px] sm:right-[-10px] md:right-0 top-36 sm:top-40 md:top-44 w-[130px] sm:w-[160px] md:w-[190px] h-[75px] sm:h-[95px] z-0">
        <svg viewBox="0 0 140 80" fill="none" className="w-full h-full overflow-visible" filter="url(#crayon-rough)">
          <path
            d="M26 56 C14 56 6 48 6 36 C6 26 14 20 24 20 C27 12 37 5 49 5 C62 5 72 13 75 22 C85 20 95 27 96 37 C101 42 101 50 96 55 C93 58 86 60 81 60 L26 56 Z"
            fill="#C9E3FB"
            fillOpacity="0.55"
            stroke="#659FD8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:fill-[#2B4C6F]/30 dark:stroke-[#5D8EB9]"
          />
          {/* Inner scribbles */}
          <path
            d="M 20 38 C 28 32 40 32 46 38 M 52 28 C 58 22 70 25 76 34"
            stroke="#85B7E5"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Playful Yellow Crayon Star */}
      <div className="absolute right-[90px] sm:right-[140px] md:right-[180px] lg:right-[210px] top-[170px] sm:top-[195px] md:top-[215px] w-6 sm:w-7 h-6 sm:h-7 z-0">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full rotate-[15deg]" filter="url(#crayon-rough)">
          <path
            d="M12 2 L14.5 8.5 L21.5 9 L16 13.5 L18 20.5 L12 16.5 L6 20.5 L8 13.5 L2.5 9 L9.5 8.5 Z"
            fill="#FDE68A"
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:fill-[#F59E0B]/40 dark:stroke-[#FBBF24]"
          />
        </svg>
      </div>

      {/* Cute Pink Crayon Star */}
      <div className="absolute right-[125px] sm:right-[180px] md:right-[230px] lg:right-[270px] top-[230px] sm:top-[260px] md:top-[285px] w-5 sm:w-6 h-5 sm:h-6 z-0">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full rotate-[-10deg]" filter="url(#crayon-rough)">
          <path
            d="M12 2 L14.5 8.5 L21.5 9 L16 13.5 L18 20.5 L12 16.5 L6 20.5 L8 13.5 L2.5 9 L9.5 8.5 Z"
            fill="#FBCFE8"
            stroke="#F472B6"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:fill-[#F472B6]/40 dark:stroke-[#F472B6]"
          />
        </svg>
      </div>

      {/* Fluttering Crayon Butterfly with Dotted Flight Trail */}
      <div className="absolute right-[45px] sm:right-[85px] md:right-[125px] lg:right-[165px] top-[260px] sm:top-[290px] md:top-[320px] w-[130px] sm:w-[155px] md:w-[175px] h-[75px] sm:h-[90px] z-0">
        <svg viewBox="0 0 160 80" fill="none" className="w-full h-full overflow-visible" filter="url(#crayon-rough)">
          {/* Dashed Loop Flight Path */}
          <path
            d="M 10 65 C 40 75 70 65 90 45 C 105 30 115 15 125 35"
            stroke="#F5A623"
            strokeWidth="2.2"
            strokeDasharray="4 6"
            strokeLinecap="round"
            fill="none"
            className="dark:stroke-[#FBBF24]/70"
          />

          {/* Butterfly Body and Wings */}
          <g transform="translate(125, 25) rotate(-15)">
            {/* Left Top Wing */}
            <path
              d="M 0 0 C -12 -16 -24 -6 -12 2 Z"
              fill="#FDE68A"
              stroke="#F59E0B"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Left Bottom Wing */}
            <path
              d="M 0 3 C -10 6 -16 16 -6 12 Z"
              fill="#FDE68A"
              stroke="#F59E0B"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Right Top Wing */}
            <path
              d="M 4 0 C 16 -16 28 -6 16 2 Z"
              fill="#FDE68A"
              stroke="#F59E0B"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Right Bottom Wing */}
            <path
              d="M 4 3 C 14 6 20 16 10 12 Z"
              fill="#FDE68A"
              stroke="#F59E0B"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Butterfly Body */}
            <ellipse cx="2" cy="3" rx="2" ry="7" fill="#78350F" />
            {/* Antennae */}
            <path d="M 1 -4 C -2 -9 -5 -8 -4 -11 M 3 -4 C 6 -9 9 -8 8 -11" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. LEFT SIDE: Rolling Hill, Large Crayon Tree & Flowers
      ────────────────────────────────────────────────────────────── */}
      {/* Rolling Hill on Left */}
      <div className="absolute left-[-20px] bottom-[-20px] w-[340px] sm:w-[440px] md:w-[540px] lg:w-[620px] h-[280px] sm:h-[340px] md:h-[400px] z-0">
        <svg viewBox="0 0 540 400" fill="none" className="w-full h-full overflow-visible" filter="url(#crayon-rough)">
          {/* Main Hill Shape */}
          <path
            d="M -30 420 L -30 180 C 40 180 120 220 200 270 C 290 325 380 345 540 370 L 540 420 Z"
            fill="#8DBE84"
            fillOpacity="0.75"
            stroke="#5D9754"
            strokeWidth="3.2"
            strokeLinecap="round"
            className="dark:fill-[#2A482A]/70 dark:stroke-[#467A46]"
          />
          {/* Grassy Crayon Hatch Lines */}
          <path
            d="M -30 420 L -30 180 C 40 180 120 220 200 270 C 290 325 380 345 540 370 L 540 420 Z"
            fill="url(#crayon-hatch-green)"
          />

          {/* Grass Tufts on Hill Slope */}
          <g stroke="#3D7535" strokeWidth="2.2" strokeLinecap="round">
            {/* Group 1 */}
            <path d="M 40 260 L 36 248 M 40 260 L 41 245 M 40 260 L 47 249" />
            {/* Group 2 */}
            <path d="M 95 305 L 90 292 M 95 305 L 96 288 M 95 305 L 102 293" />
            {/* Group 3 */}
            <path d="M 160 335 L 156 322 M 160 335 L 161 318 M 160 335 L 167 323" />
            {/* Group 4 */}
            <path d="M 230 360 L 225 348 M 230 360 L 231 344 M 230 360 L 237 349" />
          </g>

          {/* Daisy 1: Yellow Flower with Orange Center */}
          <g transform="translate(65, 235)">
            {/* Stem */}
            <path d="M 12 32 C 10 22 13 14 12 0" stroke="#3D7535" strokeWidth="2.4" strokeLinecap="round" />
            {/* Leaf */}
            <path d="M 11 20 C 5 18 3 14 4 12 C 7 13 10 16 11 20 Z" fill="#6DA663" stroke="#3D7535" strokeWidth="1.2" />
            {/* Petals */}
            <circle cx="12" cy="-7" r="4.5" fill="#FDE68A" stroke="#F5A623" strokeWidth="1.2" />
            <circle cx="5" cy="-2" r="4.5" fill="#FDE68A" stroke="#F5A623" strokeWidth="1.2" />
            <circle cx="19" cy="-2" r="4.5" fill="#FDE68A" stroke="#F5A623" strokeWidth="1.2" />
            <circle cx="8" cy="5" r="4.5" fill="#FDE68A" stroke="#F5A623" strokeWidth="1.2" />
            <circle cx="16" cy="5" r="4.5" fill="#FDE68A" stroke="#F5A623" strokeWidth="1.2" />
            {/* Flower Center */}
            <circle cx="12" cy="0" r="4.5" fill="#F59E0B" />
          </g>

          {/* Daisy 2: Orange/Coral Flower */}
          <g transform="translate(125, 280)">
            {/* Stem */}
            <path d="M 10 30 C 8 20 12 12 10 0" stroke="#3D7535" strokeWidth="2.4" strokeLinecap="round" />
            {/* Leaf */}
            <path d="M 10 18 C 15 16 18 12 17 10 C 14 11 11 14 10 18 Z" fill="#6DA663" stroke="#3D7535" strokeWidth="1.2" />
            {/* Petals */}
            <circle cx="10" cy="-6" r="4" fill="#FDBA74" stroke="#EA580C" strokeWidth="1.2" />
            <circle cx="4" cy="-2" r="4" fill="#FDBA74" stroke="#EA580C" strokeWidth="1.2" />
            <circle cx="16" cy="-2" r="4" fill="#FDBA74" stroke="#EA580C" strokeWidth="1.2" />
            <circle cx="6" cy="4" r="4" fill="#FDBA74" stroke="#EA580C" strokeWidth="1.2" />
            <circle cx="14" cy="4" r="4" fill="#FDBA74" stroke="#EA580C" strokeWidth="1.2" />
            {/* Center */}
            <circle cx="10" cy="0" r="4" fill="#FDE047" />
          </g>

          {/* Crayon dash strokes */}
          <g stroke="#3D7535" strokeWidth="2" strokeLinecap="round" opacity="0.6">
            <path d="M 155 270 L 168 266 M 158 276 L 173 271 M 162 283 L 175 278" />
          </g>
        </svg>
      </div>

      {/* Tall Crayon Tree on Left Hill */}
      <div className="absolute left-[-20px] sm:left-[-10px] md:left-2 bottom-[90px] sm:bottom-[120px] md:bottom-[140px] w-[180px] sm:w-[230px] md:w-[280px] lg:w-[320px] h-[240px] sm:h-[300px] md:h-[370px] lg:h-[420px] z-0">
        <svg viewBox="0 0 260 360" fill="none" className="w-full h-full overflow-visible" filter="url(#crayon-rough)">
          {/* Tree Trunk & Branches */}
          <g stroke="#8B5A2B" strokeLinecap="round" strokeLinejoin="round">
            {/* Main Trunk */}
            <path
              d="M 78 350 C 75 290 70 230 65 170 C 63 150 56 135 45 115 L 56 115 C 68 135 76 155 80 185 C 88 230 92 290 98 350 Z"
              fill="#A06738"
              strokeWidth="2.8"
              className="dark:fill-[#5C3A1E]"
            />
            {/* Left Branch */}
            <path
              d="M 68 175 C 55 155 38 140 22 132 L 28 126 C 45 135 60 150 72 168 Z"
              fill="#A06738"
              strokeWidth="2"
            />
            {/* Right Branch */}
            <path
              d="M 78 165 C 92 145 110 130 128 122 L 132 128 C 115 135 98 152 84 172 Z"
              fill="#A06738"
              strokeWidth="2"
            />
            {/* Bark Texture Lines */}
            <path d="M 76 330 L 73 250 M 85 340 L 82 230 M 89 310 L 87 260" stroke="#683F1A" strokeWidth="1.6" opacity="0.65" />
          </g>

          {/* Lush Green Crayon Foliage Canopy */}
          {/* Background darker foliage cluster */}
          <path
            d="M 35 125 C 10 120 -5 95 2 70 C 8 45 35 30 55 40 C 70 15 105 10 125 30 C 145 15 175 25 180 50 C 205 60 210 95 195 120 C 180 145 150 150 135 140 C 120 160 85 165 65 150 C 48 155 38 140 35 125 Z"
            fill="#568F4C"
            fillOpacity="0.85"
            stroke="#3B6834"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:fill-[#2B4B26]/80 dark:stroke-[#3F6E38]"
          />
          <path
            d="M 35 125 C 10 120 -5 95 2 70 C 8 45 35 30 55 40 C 70 15 105 10 125 30 C 145 15 175 25 180 50 C 205 60 210 95 195 120 C 180 145 150 150 135 140 C 120 160 85 165 65 150 C 48 155 38 140 35 125 Z"
            fill="url(#crayon-hatch-leaf)"
          />

          {/* Foreground mid-green clusters with rich scribble contours */}
          <g stroke="#3B6834" strokeWidth="2.5" fill="#72AA66" fillOpacity="0.85" strokeLinecap="round">
            {/* Left lobe */}
            <circle cx="48" cy="85" r="34" />
            {/* Center lobe */}
            <circle cx="105" cy="65" r="42" />
            {/* Right lobe */}
            <circle cx="155" cy="95" r="35" />
            {/* Lower center lobe */}
            <circle cx="102" cy="115" r="32" />
          </g>

          {/* Highlights in sunlit lime-green scribbles */}
          <g stroke="#8EC782" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.9">
            <path d="M 32 75 C 38 60 56 60 62 72 M 42 92 C 50 82 66 85 70 98" />
            <path d="M 85 52 C 95 38 120 40 128 55 M 95 72 C 105 60 125 65 130 80" />
            <path d="M 142 80 C 150 68 168 70 172 85 M 148 102 C 156 92 172 96 174 110" />
          </g>
        </svg>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. BOTTOM-RIGHT: Rolling Hill, Crayon Bushes & Daisies
      ────────────────────────────────────────────────────────────── */}
      <div className="absolute right-[-20px] bottom-[-20px] w-[320px] sm:w-[420px] md:w-[500px] lg:w-[580px] h-[220px] sm:h-[280px] md:h-[340px] z-0">
        <svg viewBox="0 0 500 340" fill="none" className="w-full h-full overflow-visible" filter="url(#crayon-rough)">
          {/* Bottom Right Rolling Hill */}
          <path
            d="M 0 350 L 0 300 C 120 280 220 240 320 200 C 390 170 450 160 520 150 L 520 350 Z"
            fill="#8DBE84"
            fillOpacity="0.75"
            stroke="#5D9754"
            strokeWidth="3.2"
            strokeLinecap="round"
            className="dark:fill-[#2A482A]/70 dark:stroke-[#467A46]"
          />
          <path
            d="M 0 350 L 0 300 C 120 280 220 240 320 200 C 390 170 450 160 520 150 L 520 350 Z"
            fill="url(#crayon-hatch-green)"
          />

          {/* Lush Green Crayon Bush in the Corner */}
          <g transform="translate(340, 140)">
            {/* Bush back clusters */}
            <circle cx="45" cy="50" r="38" fill="#4B8144" fillOpacity="0.8" stroke="#315B2D" strokeWidth="2.5" />
            <circle cx="105" cy="40" r="44" fill="#4B8144" fillOpacity="0.8" stroke="#315B2D" strokeWidth="2.5" />
            <circle cx="155" cy="55" r="35" fill="#4B8144" fillOpacity="0.8" stroke="#315B2D" strokeWidth="2.5" />

            {/* Bush foreground clusters */}
            <circle cx="70" cy="75" r="36" fill="#66A35E" fillOpacity="0.9" stroke="#315B2D" strokeWidth="2.8" />
            <circle cx="125" cy="70" r="38" fill="#66A35E" fillOpacity="0.9" stroke="#315B2D" strokeWidth="2.8" />

            {/* Inner leafy scribbles */}
            <path
              d="M 55 60 C 65 48 85 52 90 68 M 110 55 C 120 42 140 46 146 62 M 75 82 C 85 72 105 75 110 90"
              stroke="#8EC782"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* White Daisy with Yellow Center in bottom right */}
          <g transform="translate(310, 185)">
            <path d="M 12 30 C 10 20 14 10 12 0" stroke="#3D7535" strokeWidth="2.2" strokeLinecap="round" />
            {/* White petals with soft gray pencil outline */}
            <circle cx="12" cy="-6" r="4.2" fill="#FFFFFF" stroke="#9CA3AF" strokeWidth="1" />
            <circle cx="5" cy="-2" r="4.2" fill="#FFFFFF" stroke="#9CA3AF" strokeWidth="1" />
            <circle cx="19" cy="-2" r="4.2" fill="#FFFFFF" stroke="#9CA3AF" strokeWidth="1" />
            <circle cx="7" cy="5" r="4.2" fill="#FFFFFF" stroke="#9CA3AF" strokeWidth="1" />
            <circle cx="17" cy="5" r="4.2" fill="#FFFFFF" stroke="#9CA3AF" strokeWidth="1" />
            <circle cx="12" cy="0" r="4" fill="#FBBF24" />
          </g>

          {/* Yellow Daisy Flower */}
          <g transform="translate(255, 230)">
            <path d="M 10 28 C 8 18 12 10 10 0" stroke="#3D7535" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="10" cy="-5" r="4" fill="#FDE68A" stroke="#F5A623" strokeWidth="1" />
            <circle cx="4" cy="-1" r="4" fill="#FDE68A" stroke="#F5A623" strokeWidth="1" />
            <circle cx="16" cy="-1" r="4" fill="#FDE68A" stroke="#F5A623" strokeWidth="1" />
            <circle cx="6" cy="5" r="4" fill="#FDE68A" stroke="#F5A623" strokeWidth="1" />
            <circle cx="14" cy="5" r="4" fill="#FDE68A" stroke="#F5A623" strokeWidth="1" />
            <circle cx="10" cy="0" r="3.8" fill="#F59E0B" />
          </g>

          {/* Grass Tufts on Right Hill */}
          <g stroke="#3D7535" strokeWidth="2.2" strokeLinecap="round">
            <path d="M 215 285 L 210 272 M 215 285 L 216 268 M 215 285 L 222 273" />
            <path d="M 290 250 L 286 238 M 290 250 L 291 234 M 290 250 L 297 239" />
          </g>
        </svg>
      </div>

      {/* Center Bottom Rolling Hill Connection */}
      <div className="absolute left-[30%] right-[30%] bottom-[-10px] h-[70px] z-0">
        <svg viewBox="0 0 300 70" fill="none" className="w-full h-full overflow-visible" filter="url(#crayon-rough)">
          <path
            d="M 0 70 C 80 50 220 50 300 70 Z"
            fill="#8DBE84"
            fillOpacity="0.75"
            stroke="#5D9754"
            strokeWidth="2.8"
            className="dark:fill-[#2A482A]/70 dark:stroke-[#467A46]"
          />
          {/* Center Grass Tufts */}
          <g stroke="#3D7535" strokeWidth="2" strokeLinecap="round">
            <path d="M 140 58 L 137 46 M 140 58 L 141 42 M 140 58 L 146 47" />
            <path d="M 165 60 L 162 48 M 165 60 L 166 45 M 165 60 L 171 49" />
          </g>
        </svg>
      </div>
    </div>
  );
}
