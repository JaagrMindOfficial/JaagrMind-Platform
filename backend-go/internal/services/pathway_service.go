package services

import (
	"sort"

	"github.com/jaagrmind/platform-api/internal/core/domain"
)

// Tie-breaker priority lookup (lower index = higher priority)
var bucketTiePriority = map[domain.BucketType]int{
	domain.BucketLoadRegulation: 0,
	domain.BucketSelfSafety:     1,
	domain.BucketAttnStability:  2,
	domain.BucketSocialComfort:  3,
}

// 16-Track Matrix Definition + Balance Mode
func GetPathwayTrack(primary, secondary domain.BucketType, isBalanceMode bool) domain.PathwayTrack {
	if isBalanceMode {
		return domain.PathwayTrack{
			TrackID:         "BALANCE_MODE",
			TrackName:       "Balance Mode – All-Round Flourish",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			IsBalanceMode:   true,
			StudentHeading:  "You are in Balance Mode.",
			StudentSubtext:  "You will engage with a balanced mix of activities to sustain regulation capacity.",
		}
	}

	key := string(primary) + ":" + string(secondary)
	switch key {
	// ATTN_STABILITY (Rows)
	case "ATTN_STABILITY:ATTN_STABILITY":
		return domain.PathwayTrack{
			TrackID:         "TRACK_FB_CORE",
			TrackName:       "Focus Builder – Core Focus",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Attention & Focus Flow",
			StudentSubtext:  "Strengthening continuous concentration and task initiation stamina.",
		}
	case "ATTN_STABILITY:LOAD_REGULATION":
		return domain.PathwayTrack{
			TrackID:         "TRACK_FB_RESET",
			TrackName:       "Focus Builder – with Reset Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Attention & Focus Flow",
			StudentSubtext:  "Strengthening focus capacity while practicing cognitive down-regulation.",
		}
	case "ATTN_STABILITY:SELF_SAFETY":
		return domain.PathwayTrack{
			TrackID:         "TRACK_FB_GROUND",
			TrackName:       "Focus Builder – with Ground Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Attention & Focus Flow",
			StudentSubtext:  "Cultivating steady attention rooted in inner stability and confidence.",
		}
	case "ATTN_STABILITY:SOCIAL_COMFORT":
		return domain.PathwayTrack{
			TrackID:         "TRACK_FB_CONNECT",
			TrackName:       "Focus Builder – with Connect Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Attention & Focus Flow",
			StudentSubtext:  "Building focus flow alongside ease in collaborative environments.",
		}

	// LOAD_REGULATION (Rows)
	case "LOAD_REGULATION:ATTN_STABILITY":
		return domain.PathwayTrack{
			TrackID:         "TRACK_CR_FOCUS",
			TrackName:       "Calm Reset – with Focus Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Calm & Stress Reset",
			StudentSubtext:  "Releasing accumulated cognitive strain to restore clear attention.",
		}
	case "LOAD_REGULATION:LOAD_REGULATION":
		return domain.PathwayTrack{
			TrackID:         "TRACK_CR_CORE",
			TrackName:       "Calm Reset – Core Reset",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Calm & Stress Reset",
			StudentSubtext:  "Developing autonomous nervous system reset techniques for high-pressure moments.",
		}
	case "LOAD_REGULATION:SELF_SAFETY":
		return domain.PathwayTrack{
			TrackID:         "TRACK_CR_GROUND",
			TrackName:       "Calm Reset – with Ground Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Calm & Stress Reset",
			StudentSubtext:  "Down-regulating physical stress and building internal somatic safety.",
		}
	case "LOAD_REGULATION:SOCIAL_COMFORT":
		return domain.PathwayTrack{
			TrackID:         "TRACK_CR_CONNECT",
			TrackName:       "Calm Reset – with Connect Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Calm & Stress Reset",
			StudentSubtext:  "Alleviating performance pressure and finding calm in social settings.",
		}

	// SELF_SAFETY (Rows)
	case "SELF_SAFETY:ATTN_STABILITY":
		return domain.PathwayTrack{
			TrackID:         "TRACK_SS_FOCUS",
			TrackName:       "Safe Space – with Focus Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Inner Grounding & Confidence",
			StudentSubtext:  "Deepening internal security while maintaining steady attention cadence.",
		}
	case "SELF_SAFETY:LOAD_REGULATION":
		return domain.PathwayTrack{
			TrackID:         "TRACK_SS_RESET",
			TrackName:       "Safe Space – with Reset Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Inner Grounding & Confidence",
			StudentSubtext:  "Building self-assurance through rapid physiological stress recovery.",
		}
	case "SELF_SAFETY:SELF_SAFETY":
		return domain.PathwayTrack{
			TrackID:         "TRACK_SS_CORE",
			TrackName:       "Safe Space – Core Ground",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Inner Grounding & Confidence",
			StudentSubtext:  "Establishing foundational emotional security and self-trust.",
		}
	case "SELF_SAFETY:SOCIAL_COMFORT":
		return domain.PathwayTrack{
			TrackID:         "TRACK_SS_CONNECT",
			TrackName:       "Safe Space – with Connect Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Inner Grounding & Confidence",
			StudentSubtext:  "Fostering inner safety to enable authentic, low-friction connection.",
		}

	// SOCIAL_COMFORT (Rows)
	case "SOCIAL_COMFORT:ATTN_STABILITY":
		return domain.PathwayTrack{
			TrackID:         "TRACK_CE_FOCUS",
			TrackName:       "Connect Ease – with Focus Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Social Comfort & Belonging",
			StudentSubtext:  "Cultivating ease in peer interactions alongside focused engagement.",
		}
	case "SOCIAL_COMFORT:LOAD_REGULATION":
		return domain.PathwayTrack{
			TrackID:         "TRACK_CE_RESET",
			TrackName:       "Connect Ease – with Reset Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Social Comfort & Belonging",
			StudentSubtext:  "Easing social anxiety by balancing autonomic energy and calm.",
		}
	case "SOCIAL_COMFORT:SELF_SAFETY":
		return domain.PathwayTrack{
			TrackID:         "TRACK_CE_GROUND",
			TrackName:       "Connect Ease – with Ground Support",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Social Comfort & Belonging",
			StudentSubtext:  "Anchoring social participation in strong personal boundaries and security.",
		}
	case "SOCIAL_COMFORT:SOCIAL_COMFORT":
		return domain.PathwayTrack{
			TrackID:         "TRACK_CE_CORE",
			TrackName:       "Connect Ease – Core Connect",
			PrimaryBucket:   primary,
			SecondaryBucket: secondary,
			StudentHeading:  "Current Focus: Social Comfort & Belonging",
			StudentSubtext:  "Strengthening feelings of belonging and shared presence in group dynamics.",
		}

	default:
		return domain.PathwayTrack{
			TrackID:         "TRACK_CR_FOCUS",
			TrackName:       "Calm Reset – with Focus Support",
			PrimaryBucket:   domain.BucketLoadRegulation,
			SecondaryBucket: domain.BucketAttnStability,
			StudentHeading:  "Current Focus: Calm & Stress Reset",
			StudentSubtext:  "Releasing accumulated cognitive strain to restore clear attention.",
		}
	}
}

// Evaluates bucket scores (max 32 each) and assigns Primary, Secondary, and Track
func EvaluatePathwayBuckets(bucketScores map[domain.BucketType]int) (domain.PathwayTrack, []domain.BucketScore) {
	// Prepare items for sorting
	var items []domain.BucketScore
	allStable := true

	for b, score := range bucketScores {
		status := domain.BucketStatusStable
		if score >= 23 {
			status = domain.BucketStatusSupportNeeded
			allStable = false
		} else if score >= 15 {
			status = domain.BucketStatusEmerging
			allStable = false
		}

		items = append(items, domain.BucketScore{
			Bucket: b,
			Score:  score,
			Status: status,
		})
	}

	// Sort Highest to Lowest. On ties, apply biological priority:
	// LOAD_REGULATION > SELF_SAFETY > ATTN_STABILITY > SOCIAL_COMFORT
	sort.Slice(items, func(i, j int) bool {
		if items[i].Score != items[j].Score {
			return items[i].Score > items[j].Score
		}
		// Tie-breaker
		return bucketTiePriority[items[i].Bucket] < bucketTiePriority[items[j].Bucket]
	})

	if len(items) == 0 {
		return GetPathwayTrack(domain.BucketLoadRegulation, domain.BucketAttnStability, false), items
	}

	primary := items[0].Bucket
	secondary := items[0].Bucket
	if len(items) > 1 {
		secondary = items[1].Bucket
	}

	track := GetPathwayTrack(primary, secondary, allStable)
	return track, items
}
