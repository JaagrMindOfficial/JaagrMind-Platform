package services_test

import (
	"testing"

	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/services"
)

func TestEvaluatePathwayBuckets_TieBreakerPriority(t *testing.T) {
	// When LOAD_REGULATION and ATTN_STABILITY tie with high scores
	scores := map[domain.BucketType]int{
		domain.BucketAttnStability:  26,
		domain.BucketLoadRegulation: 26,
		domain.BucketSelfSafety:     18,
		domain.BucketSocialComfort:  12,
	}

	track, sortedBuckets := services.EvaluatePathwayBuckets(scores)

	// LOAD_REGULATION must win Primary because of tie priority
	if sortedBuckets[0].Bucket != domain.BucketLoadRegulation {
		t.Errorf("Expected primary bucket LOAD_REGULATION, got %s", sortedBuckets[0].Bucket)
	}

	// ATTN_STABILITY must be Secondary
	if sortedBuckets[1].Bucket != domain.BucketAttnStability {
		t.Errorf("Expected secondary bucket ATTN_STABILITY, got %s", sortedBuckets[1].Bucket)
	}

	// Assigned track must be Calm Reset with Focus Support
	if track.TrackID != "TRACK_CR_FOCUS" {
		t.Errorf("Expected TRACK_CR_FOCUS, got %s", track.TrackID)
	}

	if track.IsBalanceMode {
		t.Errorf("Expected IsBalanceMode to be false")
	}
}

func TestEvaluatePathwayBuckets_BalanceMode(t *testing.T) {
	// When all buckets are <= 14 (Stable)
	scores := map[domain.BucketType]int{
		domain.BucketLoadRegulation: 12,
		domain.BucketSelfSafety:     10,
		domain.BucketAttnStability:  14,
		domain.BucketSocialComfort:  9,
	}

	track, sortedBuckets := services.EvaluatePathwayBuckets(scores)

	if !track.IsBalanceMode {
		t.Errorf("Expected Balance Mode when all scores <= 14, got false")
	}

	if track.TrackID != "BALANCE_MODE" {
		t.Errorf("Expected TrackID BALANCE_MODE, got %s", track.TrackID)
	}

	if sortedBuckets[0].Status != domain.BucketStatusStable {
		t.Errorf("Expected all buckets to be STABLE")
	}
}

func TestEvaluatePathwayBuckets_AllSixteenTracks(t *testing.T) {
	buckets := []domain.BucketType{
		domain.BucketAttnStability,
		domain.BucketLoadRegulation,
		domain.BucketSelfSafety,
		domain.BucketSocialComfort,
	}

	for _, primary := range buckets {
		for _, secondary := range buckets {
			track := services.GetPathwayTrack(primary, secondary, false)
			if track.TrackID == "" || track.TrackName == "" {
				t.Fatalf("Track for %s:%s is missing ID or Name", primary, secondary)
			}
			if track.StudentHeading == "" || track.StudentSubtext == "" {
				t.Fatalf("Track for %s:%s is missing StudentHeading or Subtext", primary, secondary)
			}
		}
	}
}
