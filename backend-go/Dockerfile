# ── Build Stage ─────────────────────────────────────────────────────────────
FROM golang:1.24-alpine AS builder

WORKDIR /app

ENV GOTOOLCHAIN=auto

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Cache module downloads
COPY go.mod go.sum ./
RUN go mod download

# Copy source tree
COPY . .

# Build statically linked, stripped binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bin/api ./cmd/api

# ── Runtime Stage ───────────────────────────────────────────────────────────
FROM alpine:3.20

WORKDIR /app

# Install runtime dependencies (SSL certs for HTTPS API calls like Resend/Oracle)
RUN apk add --no-cache ca-certificates tzdata

# Create non-root system user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create directory for fallback local object storage
RUN mkdir -p /app/object && chown -R appuser:appgroup /app

# Copy binary from builder
COPY --from=builder /app/bin/api /app/api

USER appuser

EXPOSE 8080

ENV PORT=8080

CMD ["/app/api"]
