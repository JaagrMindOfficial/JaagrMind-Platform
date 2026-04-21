/**
 * Default skill buckets + games catalog. Safe to re-run: seed script upserts by key/slug.
 */

const SKILL_BUCKETS = [
    {
        key: 'ATTN_STABILITY',
        name: 'Attention Stability',
        description:
            'Train steady attention and nervous system regulation without performance pressure. No scoring, no failure, no speed escalation.',
        sort_order: 1
    },
    {
        key: 'LOAD_REGULATION',
        name: 'Load Regulation',
        description:
            'Help discharge, release, and reset internal overload safely. Reduce internal intensity without building focus-through-stimulation.',
        sort_order: 2
    },
    {
        key: 'SELF_SAFETY',
        name: 'Self Safety',
        description:
            'Build internal safety, autonomy, and non-judgmental expression. Reduce evaluation anxiety and restore control.',
        sort_order: 3
    },
    {
        key: 'SOCIAL_COMFORT',
        name: 'Social Comfort',
        description:
            'Build safe co-regulation and social ease without comparison or performance.',
        sort_order: 4
    }
];

const GAMES = [
    // ATTN_STABILITY
    {
        slug: 'trace_arc',
        name: 'Trace Arc',
        short_description: 'Slowly drag along a moving arc at constant speed — regulation, not performance.',
        full_description:
            'User slowly drags a finger along a moving arc. Arc moves at constant speed. No scoring, no correction, endless loop. Trains sustained calm attention, visual tracking, patience. Constant speed = predictability = safety signal. Teen themes: Moon glide, Ocean wave, Orbit path, Neon arc, Soundwave curve.',
        bucketKey: 'ATTN_STABILITY',
        sort_order: 1
    },
    {
        slug: 'stack_stone',
        name: 'Stack Stone',
        short_description: 'Drag stones vertically with slight wobble — stability without fear of falling.',
        full_description:
            'Drag stones vertically. Slight wobble (<5°), never fall. Max 8 stones, no gravity. Trains fine motor control and calm micro-adjustments. No collapse prevents stress spikes. Themes: Zen rocks, Space crystals, Ice blocks, Donut stack, Pancake stack.',
        bucketKey: 'ATTN_STABILITY',
        sort_order: 2
    },
    {
        slug: 'guide_dot',
        name: 'Guide Dot',
        short_description: 'Drag a floating dot with capped speed and a fading trail — flow, not competition.',
        full_description:
            'Freely drag a floating dot. Speed capped, 2-second fading trail, no boundaries. Trains controlled movement and present-moment awareness. Themes: Glow trail, Stardust path, Energy tail, Neon ribbon, Butterfly glow.',
        bucketKey: 'ATTN_STABILITY',
        sort_order: 3
    },
    {
        slug: 'align_drift',
        name: 'Align Drift',
        short_description: 'Slide shapes toward magnetic zones with gentle snap — focus without over-efforting.',
        full_description:
            'Slide shapes toward magnetic zones. Gentle snap within fixed radius. No grid reveal, no completion screen. Trains calm precision. Soft snap = micro reward without stress. Themes: Magnetic neon shapes, Planet alignment, Constellation match, Floating crystals.',
        bucketKey: 'ATTN_STABILITY',
        sort_order: 4
    },
    {
        slug: 'balance_shift',
        name: 'Balance Shift',
        short_description: 'Slide weight across a bar that tilts slightly but never tips.',
        full_description:
            'Slide weight across a bar. Bar tilts ≤10° but never tips. Trains controlled adjustment and emotional balance awareness. Small tilt without tipping teaches instability is manageable. Themes: Energy balance beam, Surfboard on calm water, Orbit weight shift, Mood slider.',
        bucketKey: 'ATTN_STABILITY',
        sort_order: 5
    },
    // LOAD_REGULATION
    {
        slug: 'scatter_settle',
        name: 'Scatter & Settle',
        short_description: 'Swipe to scatter fragments; they auto-settle — safe discharge.',
        full_description:
            'Swipe to scatter fragments. Fragments scatter and auto-settle within 1–2 sec. Velocity capped, decay constant. Mild activation then calm return. Themes: Floating shards of light, Leaves in wind, Glow particles, Puzzle fragments, Sand on beach.',
        bucketKey: 'LOAD_REGULATION',
        sort_order: 1
    },
    {
        slug: 'press_wave',
        name: 'Press Wave',
        short_description: 'Press center circle; ring expands slightly and resets — pressure release.',
        full_description:
            'Press center circle. Ring expands ≤12% and resets on release. Mimics grounding touch and breath expansion. No duration amplification. Themes: Water ripple ring, Energy pulse, Soft aura glow, Light halo, Calm breathing circle.',
        bucketKey: 'LOAD_REGULATION',
        sort_order: 2
    },
    {
        slug: 'pour_light',
        name: 'Pour Light',
        short_description: 'Tilt to drain light at a constant rate — controlled emptying.',
        full_description:
            'Tilt container to drain light. Light drains at constant rate to baseline. No refill logic, no completion signal. Symbolic “pour out” mental overload. Themes: Glowing liquid, Stardust pouring, Light draining from bulb, Neon energy container, Magic glow jar.',
        bucketKey: 'LOAD_REGULATION',
        sort_order: 3
    },
    {
        slug: 'tap_ripples',
        name: 'Tap Ripples',
        short_description: 'Tap to create a fixed-size ripple that fades evenly.',
        full_description:
            'Tap surface to create ripple. Ripple fixed size, fades evenly. No stacking, tap frequency capped. Contained activation: impulse → expression → calm. Themes: Water surface, Space ripple, Bubble ring, Soundwave ripple, Moon reflection.',
        bucketKey: 'LOAD_REGULATION',
        sort_order: 4
    },
    {
        slug: 'shift_load',
        name: 'Shift Load',
        short_description: 'Slide an object between two zones with subtle hue shift — no “correct side”.',
        full_description:
            'Slide object between two zones. Subtle hue shift capped. No persistent state, no tracking. Cognitive load shifting with emotional flexibility. Themes: Mood slider orb, Day–night shift, Energy gradient bar, Temperature control orb, Color balance sphere.',
        bucketKey: 'LOAD_REGULATION',
        sort_order: 5
    },
    // SELF_SAFETY
    {
        slug: 'place_field',
        name: 'Place Field',
        short_description: 'Drag shapes anywhere; they stay — autonomy without correction.',
        full_description:
            'Drag shapes anywhere. Shapes stay exactly where dropped. Max 4 shapes, no snapping. Builds psychological safety and control. Themes: Floating planets, Petals on ground, Soft abstract shapes, Space objects, Leaves on field.',
        bucketKey: 'SELF_SAFETY',
        sort_order: 1
    },
    {
        slug: 'color_switch',
        name: 'Color Switch',
        short_description: 'Toggle between two themes instantly — choice without attachment.',
        full_description:
            'Toggle between two themes. Instant palette swap. Only 2 themes, no preference saved. Themes: Day ↔ Night, Cool Blue ↔ Warm Amber, Dark Mode ↔ Soft Gradient, Forest ↔ Pastel.',
        bucketKey: 'SELF_SAFETY',
        sort_order: 2
    },
    {
        slug: 'build_stack',
        name: 'Build Stack',
        short_description: 'Stack blocks with wobble but no collapse — confidence without fear.',
        full_description:
            'Stack blocks freely. Slight wobble, never collapse. No gravity escalation, no height counter. Themes: Ice blocks, Calm stone stack, Soft donut stack, Space cubes, Foam bricks.',
        bucketKey: 'SELF_SAFETY',
        sort_order: 3
    },
    {
        slug: 'grow_tap',
        name: 'Grow Tap',
        short_description: 'Tap to grow with fixed increments — measured expansion.',
        full_description:
            'Tap object to grow. Fixed growth increment capped at 30%. No acceleration, no reward animation. Themes: Plant growing, Moon filling, Bubble expanding, Ember glowing, Crystal enlarging.',
        bucketKey: 'SELF_SAFETY',
        sort_order: 4
    },
    {
        slug: 'draw_fade',
        name: 'Draw Fade',
        short_description: 'Draw freely; lines fade — expression without attachment.',
        full_description:
            'Draw freely. Lines fade at constant duration. No save state, no evaluation. Themes: Light pen in dark mode, Neon ink, Water trail, Stardust drawing, Soft glow brush.',
        bucketKey: 'SELF_SAFETY',
        sort_order: 5
    },
    // SOCIAL_COMFORT
    {
        slug: 'move_pair',
        name: 'Move Pair',
        short_description: 'Drag one shape; a partner follows at fixed offset — togetherness without merge.',
        full_description:
            'Drag primary shape; secondary follows at fixed offset. Offset constant, no merge. Themes: Two planets orbiting, Two fish swimming, Two light orbs, Paired butterflies, Twin stars.',
        bucketKey: 'SOCIAL_COMFORT',
        sort_order: 1
    },
    {
        slug: 'match_pulse',
        name: 'Match Pulse',
        short_description: 'Tap during a steady pulse — no timing reward, pulse unchanged.',
        full_description:
            'Tap during steady pulse. Identical ripple; pulse timing unchanged. No timing reward. Themes: Music beat circle, Ocean tide pulse, Heartbeat glow, Energy wave, Night rhythm light.',
        bucketKey: 'SOCIAL_COMFORT',
        sort_order: 2
    },
    {
        slug: 'side_walk',
        name: 'Side Walk',
        short_description: 'Drag avatar; second moves parallel at same speed — side-by-side presence.',
        full_description:
            'Drag avatar; second avatar moves parallel at same speed. Distance fixed, no tracking. Themes: Two silhouettes walking, Two wolves pacing, Twin light figures, Two birds gliding, Sunset walk.',
        bucketKey: 'SOCIAL_COMFORT',
        sort_order: 3
    },
    {
        slug: 'take_turns',
        name: 'Take Turns',
        short_description: 'Tap alternating glowing zones — glow alternates independently of taps.',
        full_description:
            'Tap alternating glowing zones. Glow alternates independently of taps. No timing detection. Themes: Dual pads lighting, Alternating neon tiles, Tide switching sides, Twin energy spots, Light panels switching.',
        bucketKey: 'SOCIAL_COMFORT',
        sort_order: 4
    },
    {
        slug: 'hold_same',
        name: 'Hold Same',
        short_description: 'Hold one shape; second glows same intensity — co-regulated stillness.',
        full_description:
            'Hold one shape; second glows same intensity; release resets. No duration amplification. Themes: Two glowing orbs, Twin moons, Paired crystals, Two embers glowing, Twin stars.',
        bucketKey: 'SOCIAL_COMFORT',
        sort_order: 5
    }
];

module.exports = { SKILL_BUCKETS, GAMES };
