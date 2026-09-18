package utils

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// StorageService defines the interface for storing and retrieving files (like school logos)
type StorageService interface {
	UploadFile(ctx context.Context, file *multipart.FileHeader, folder string) (string, error)
}

// ── Oracle S3 Implementation ────────────────────────────────────────────────

type oracleStorageService struct {
	client *s3.Client
	bucket string
}

func NewOracleStorageService() (StorageService, error) {
	key := os.Getenv("ORACLE_ACCESS_KEY_ID")
	secret := os.Getenv("ORACLE_SECRET_ACCESS_KEY")
	region := os.Getenv("ORACLE_REGION")
	endpoint := os.Getenv("ORACLE_S3_ENDPOINT")
	bucket := os.Getenv("ORACLE_BUCKET")

	if key == "" || secret == "" || region == "" || endpoint == "" || bucket == "" {
		return nil, fmt.Errorf("missing Oracle S3 environment variables")
	}

	// We use the AWS SDK v2 with a custom endpoint resolver for Oracle Object Storage
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(key, secret, "")),
		config.WithEndpointResolverWithOptions(aws.EndpointResolverWithOptionsFunc(
			func(service, region string, options ...interface{}) (aws.Endpoint, error) {
				return aws.Endpoint{
					URL: endpoint,
				}, nil
			}),
		),
	)

	if err != nil {
		return nil, err
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	return &oracleStorageService{
		client: client,
		bucket: bucket,
	}, nil
}

func (s *oracleStorageService) UploadFile(ctx context.Context, file *multipart.FileHeader, folder string) (string, error) {
	f, err := file.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()

	// Read content to memory (be mindful of large files)
	buf := bytes.NewBuffer(nil)
	if _, err := io.Copy(buf, f); err != nil {
		return "", err
	}

	// Generate a unique file name
	ext := filepath.Ext(file.Filename)
	objectKey := fmt.Sprintf("%s/%d-%s%s", folder, time.Now().Unix(), uuid.New().String()[:8], ext)

	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(objectKey),
		Body:        bytes.NewReader(buf.Bytes()),
		ContentType: aws.String(file.Header.Get("Content-Type")),
		// Oracle S3 doesn't support all ACLs exactly like AWS, so we omit ACLs here
		// You control bucket visibility via OCI Console.
	})

	if err != nil {
		return "", err
	}

	// For Oracle, public URLs follow this pattern if the bucket is public:
	// https://<namespace>.compat.objectstorage.<region>.oraclecloud.com/<bucket>/<objectKey>
	endpoint := os.Getenv("ORACLE_S3_ENDPOINT")
	return fmt.Sprintf("%s/%s/%s", endpoint, s.bucket, objectKey), nil
}

// ── Local Mock Implementation ───────────────────────────────────────────────

type localStorageService struct {
	baseDir string
	baseURL string
}

// NewLocalStorageService stores files in backend-go/object/
func NewLocalStorageService() (StorageService, error) {
	// The root folder is meant to be the backend-go folder
	baseDir := "./object"
	
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, err
	}

	baseURL := os.Getenv("BACKEND_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}

	return &localStorageService{
		baseDir: baseDir,
		baseURL: baseURL,
	}, nil
}

func (s *localStorageService) UploadFile(ctx context.Context, file *multipart.FileHeader, folder string) (string, error) {
	f, err := file.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()

	targetDir := filepath.Join(s.baseDir, folder)
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return "", err
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%d-%s%s", time.Now().Unix(), uuid.New().String()[:8], ext)
	dstPath := filepath.Join(targetDir, filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, f); err != nil {
		return "", err
	}

	// We return a URL that we will need to serve statically in Fiber
	return fmt.Sprintf("%s/object/%s/%s", s.baseURL, folder, filename), nil
}

// ── Storage Factory ─────────────────────────────────────────────────────────

func NewStorageService() (StorageService, error) {
	provider := os.Getenv("STORAGE_PROVIDER")
	if provider == "oracle" {
		return NewOracleStorageService()
	}
	// Fallback to local
	return NewLocalStorageService()
}
